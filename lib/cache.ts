import { createHash } from "node:crypto";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { applyFilters } from "./filter";
import { getDb } from "./firebase";
import type { CacheStats, Job, SearchParams } from "./types";

/** Namespaced so lite never writes into shanda's `jobs` / `users` trees. */
export const JOBS_COL = "liteJobs";
export const QUERIES_COL = "liteQueries";

/** Pull Firestore only when a live crawl returns fewer matches than this. */
export const SUPPLEMENT_IF_BELOW = 8;

/**
 * Cache is a top-up, never the bulk of a result set: cap how many cache-only
 * jobs get spliced in so a sparse live crawl can't be swamped by old listings.
 */
export const MAX_CACHE_TOPUP = 12;

const JOB_READ_LIMIT = 200;
const QUERY_JOB_CAP = 500;
const DESC_CAP = 8_000;
const GETALL_CHUNK = 10;

type StoredJob = Job & {
  countryKey?: string;
  tokens?: string[];
  lastSeenAt?: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function jobDocId(jobId: string): string {
  return sha256(jobId);
}

/** Same search (any user) shares one query document. Filters are applied after fetch. */
export function queryKey(params: SearchParams): string {
  const keywords = [...params.keywords]
    .map((k) => k.toLowerCase().trim())
    .sort()
    .join("|");
  const location = params.mode === "local" ? params.location.toLowerCase().trim() : "";
  return sha256(`${params.mode}|${keywords}|${location}`);
}

function keywordTokens(params: SearchParams): string[] {
  return params.keywords
    .map((k) => k.toLowerCase().trim())
    .filter((k) => k.length > 1)
    .slice(0, 8);
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function toJob(data: StoredJob): Job | null {
  if (!data?.id || !data.title) return null;
  return {
    id: data.id,
    title: data.title,
    company: data.company || "Unknown company",
    location: data.location || "",
    country: data.country,
    remoteType: data.remoteType,
    employmentType: data.employmentType,
    description: data.description || "",
    url: data.url || "",
    source: data.source || "",
    postedAt: data.postedAt,
    salary: data.salary,
  };
}

async function loadByIds(db: Firestore, ids: string[]): Promise<Job[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  const jobs: Job[] = [];
  for (const group of chunks(unique, GETALL_CHUNK)) {
    const refs = group.map((id) => db.doc(`${JOBS_COL}/${jobDocId(id)}`));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const job = toJob(snap.data() as StoredJob);
      if (job) jobs.push(job);
    }
  }
  return jobs;
}

/**
 * Pull previously stored jobs to top up a sparse live crawl: exact query cache,
 * then keyword pool. Country-wide pool only when no keywords (avoids stale bleed).
 */
export async function readCachedJobs(params: SearchParams): Promise<Job[]> {
  const db = getDb();
  if (!db) return [];

  try {
    const byId = new Map<string, Job>();
    const add = (jobs: Job[]) => {
      for (const job of jobs) if (!byId.has(job.id)) byId.set(job.id, job);
    };

    const qSnap = await db.doc(`${QUERIES_COL}/${queryKey(params)}`).get();
    const storedIds = (qSnap.data()?.jobIds as string[] | undefined) ?? [];
    if (storedIds.length) add(await loadByIds(db, storedIds));

    const tokens = keywordTokens(params);
    const primary = tokens.sort((a, b) => b.length - a.length)[0];
    if (primary) {
      const tokenSnap = await db
        .collection(JOBS_COL)
        .where("tokens", "array-contains", primary)
        .limit(JOB_READ_LIMIT)
        .get();
      add(tokenSnap.docs.map((d) => toJob(d.data() as StoredJob)).filter((j): j is Job => Boolean(j)));
    } else if (params.mode === "local" && params.location.trim()) {
      const countrySnap = await db
        .collection(JOBS_COL)
        .where("countryKey", "==", params.location.trim().toLowerCase())
        .limit(JOB_READ_LIMIT)
        .get();
      add(countrySnap.docs.map((d) => toJob(d.data() as StoredJob)).filter((j): j is Job => Boolean(j)));
    }

    return applyFilters([...byId.values()], params);
  } catch (err) {
    console.warn("[cache] read failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Merge cached + live. Live always wins and always shows up in full; cache only
 * fills the gap up to MAX_CACHE_TOPUP extra listings, freshest first, so a thin
 * live crawl can't get buried under a pile of old cached postings.
 */
export function mergeJobs(cached: Job[], live: Job[]): { jobs: Job[]; stats: CacheStats } {
  const liveIds = new Set(live.map((j) => j.id));
  const cacheOnly = cached
    .filter((j) => !liveIds.has(j.id))
    .sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""))
    .slice(0, MAX_CACHE_TOPUP);

  const jobs = [...live, ...cacheOnly].sort(
    (a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""),
  );
  return {
    jobs,
    stats: { fromCache: cacheOnly.length, fromLive: live.length },
  };
}

/** Persist the merged result set so the next user of this (or a related) search hits cache. */
export async function writeCachedJobs(params: SearchParams, jobs: Job[]): Promise<void> {
  const db = getDb();
  if (!db || !jobs.length) return;

  const now = new Date().toISOString();
  const tokens = keywordTokens(params);
  const countryKey =
    params.mode === "local" && params.location.trim()
      ? params.location.trim().toLowerCase()
      : "";

  try {
    for (const group of chunks(jobs, 400)) {
      const batch = db.batch();
      for (const job of group) {
        const payload: Record<string, unknown> = {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location || "",
          description: (job.description || "").slice(0, DESC_CAP),
          url: job.url || "",
          source: job.source || "",
          lastSeenAt: now,
        };
        if (job.country) payload.country = job.country;
        if (job.remoteType) payload.remoteType = job.remoteType;
        if (job.employmentType) payload.employmentType = job.employmentType;
        if (job.postedAt) payload.postedAt = job.postedAt;
        if (job.salary) payload.salary = job.salary;
        if (countryKey) payload.countryKey = countryKey;
        else if (job.country) payload.countryKey = job.country.toLowerCase();
        if (tokens.length) payload.tokens = FieldValue.arrayUnion(...tokens);

        batch.set(db.doc(`${JOBS_COL}/${jobDocId(job.id)}`), payload, { merge: true });
      }
      await batch.commit();
    }

    const key = queryKey(params);
    const ref = db.doc(`${QUERIES_COL}/${key}`);
    const prev = await ref.get();
    const prevIds = (prev.data()?.jobIds as string[] | undefined) ?? [];
    const jobIds = [...new Set([...prevIds, ...jobs.map((j) => j.id)])].slice(-QUERY_JOB_CAP);
    await ref.set(
      {
        key,
        mode: params.mode,
        keywords: params.keywords,
        location: params.mode === "local" ? params.location : "",
        jobIds,
        count: jobIds.length,
        updatedAt: now,
        hitCount: FieldValue.increment(1),
      },
      { merge: true },
    );
  } catch (err) {
    console.warn("[cache] write failed:", err instanceof Error ? err.message : err);
  }
}
