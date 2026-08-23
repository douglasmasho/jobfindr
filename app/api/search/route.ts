import { NextResponse } from "next/server";
import {
  mergeJobs,
  readCachedJobs,
  SUPPLEMENT_IF_BELOW,
  writeCachedJobs,
} from "@/lib/cache";
import { normalizeKeywords } from "@/lib/keywords";
import { applyFilters } from "@/lib/filter";
import { normalize } from "@/lib/normalize";
import { runSources } from "@/lib/sources";
import type { SearchParams, SearchResponse, WorkBasis, WorkMode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORK_MODES: WorkMode[] = ["remote", "hybrid", "on-site"];
const WORK_BASES: WorkBasis[] = ["full-time", "part-time", "contract", "internship"];

export async function POST(req: Request): Promise<Response> {
  let body: Partial<SearchParams>;
  try {
    body = (await req.json()) as Partial<SearchParams>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const params: SearchParams = {
    mode: body.mode === "remote" ? "remote" : "local",
    keywords: normalizeKeywords(body.keywords),
    location: typeof body.location === "string" ? body.location.trim() : "",
    workMode: WORK_MODES.includes(body.workMode as WorkMode) ? (body.workMode as WorkMode) : "any",
    workBasis: WORK_BASES.includes(body.workBasis as WorkBasis)
      ? (body.workBasis as WorkBasis)
      : "any",
  };

  try {
    // Live crawl always runs first — cache only tops up when the crawl is sparse.
    const live = await runSources(params);
    const fresh = applyFilters(normalize(live.raws), params);

    let jobs: SearchResponse["jobs"];
    let stats: NonNullable<SearchResponse["cache"]>;

    if (fresh.length < SUPPLEMENT_IF_BELOW) {
      const cached = await readCachedJobs(params);
      ({ jobs, stats } = mergeJobs(cached, fresh));
    } else {
      jobs = fresh.sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
      stats = { fromCache: 0, fromLive: jobs.length };
    }

    void writeCachedJobs(params, jobs);
    const payload: SearchResponse = { jobs, sources: live.runs, cache: stats };
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[search] failed:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
