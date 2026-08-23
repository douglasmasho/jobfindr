import type { JobSource, RawJob, SearchParams, SourceRun } from "../types";
import { adzuna } from "./adzuna";
import { arbeitnow } from "./arbeitnow";
import { himalayas } from "./himalayas";
import { remoteok } from "./remoteok";
import { remotive } from "./remotive";
import { themuse } from "./themuse";
import { namibiaBoards } from "./wordpress";

/** All sources. Local boards are listed first so they lead local searches. */
const ALL_SOURCES: JobSource[] = [
  ...namibiaBoards,
  adzuna,
  themuse,
  remotive,
  remoteok,
  arbeitnow,
  himalayas,
];

/** Boards that accept one search phrase per HTTP request — run once per pill. */
const PER_QUERY_SOURCES = new Set([
  "adzuna",
  "remotive",
  "najobs",
  "jobsinnamibia",
]);

function sourcesForMode(mode: SearchParams["mode"]): JobSource[] {
  return ALL_SOURCES.filter((s) => s.scope === "both" || s.scope === mode);
}

async function searchSource(source: JobSource, params: SearchParams): Promise<RawJob[]> {
  const pills = params.keywords.filter(Boolean);
  if (!pills.length) return source.search({ ...params, keywords: [] });
  if (!PER_QUERY_SOURCES.has(source.id)) {
    return source.search(params);
  }
  const batches = await Promise.all(
    pills.map((kw) => source.search({ ...params, keywords: [kw] })),
  );
  return batches.flat();
}

/**
 * Run every applicable source in parallel. A source that fails or times out is
 * reported (status) but never breaks the search. Returns the combined raw jobs
 * plus a per-source status line ("N of M sources").
 */
export async function runSources(
  params: SearchParams,
): Promise<{ raws: RawJob[]; runs: SourceRun[] }> {
  const sources = sourcesForMode(params.mode);
  const settled = await Promise.all(
    sources.map(async (source): Promise<{ run: SourceRun; jobs: RawJob[] }> => {
      try {
        const jobs = await searchSource(source, params);
        return {
          jobs,
          run: { id: source.id, name: source.name, status: "ok", count: jobs.length },
        };
      } catch (err) {
        console.warn(`[source] ${source.id} failed:`, err instanceof Error ? err.message : err);
        return {
          jobs: [],
          run: { id: source.id, name: source.name, status: "failed", count: 0 },
        };
      }
    }),
  );
  return {
    raws: settled.flatMap((s) => s.jobs),
    runs: settled.map((s) => s.run),
  };
}
