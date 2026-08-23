import type { Job } from "./types";

/** Normalize API/client input into deduped keyword pills (each pill is one phrase). */
export function normalizeKeywords(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return [
      ...new Set(
        raw
          .map((k) => (typeof k === "string" ? k.trim().replace(/\s+/g, " ") : ""))
          .filter(Boolean),
      ),
    ];
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim().replace(/\s+/g, " ");
    return trimmed ? [trimmed] : [];
  }
  return [];
}

/** Primary phrase for a single-query source call (one pill per request). */
export function primaryKeyword(keywords: string[]): string {
  return keywords[0]?.trim() ?? "";
}

/** OR match: job must contain at least one full pill as a substring. */
export function matchesAnyKeyword(job: Pick<Job, "title" | "company" | "description">, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const hay = `${job.title} ${job.company} ${job.description}`.toLowerCase();
  return keywords.some((kw) => hay.includes(kw.toLowerCase()));
}
