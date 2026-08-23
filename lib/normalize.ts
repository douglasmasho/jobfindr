import type { Job, RawJob } from "./types";

/** Strip HTML to readable text, preserving line breaks and bullets. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|tr|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;|&#8217;|&apos;/g, "'")
    .replace(/&quot;|&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, "–")
    .replace(/&#(\d+);/g, (_, n) => codePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => codePoint(parseInt(n, 16)))
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function codePoint(code: number): string {
  try {
    return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
  } catch {
    return "";
  }
}

/** Stable fingerprint: normalized apply URL, else company|title metadata. */
export function fingerprint(job: RawJob): string {
  const url = (job.url || "").split("?")[0]?.toLowerCase().replace(/\/+$/, "") ?? "";
  if (url) return `url:${url}`;
  return `meta:${(job.company || "").toLowerCase()}|${(job.title || "").toLowerCase()}`;
}

/** Fingerprint + dedupe. Later duplicates keep the first-seen record. */
export function normalize(raws: RawJob[]): Job[] {
  const byId = new Map<string, Job>();
  for (const raw of raws) {
    const title = raw.title?.trim();
    if (!title) continue;
    const id = fingerprint(raw);
    if (byId.has(id)) continue;
    byId.set(id, {
      ...raw,
      id,
      title,
      company: raw.company?.trim() || "Unknown company",
      description: raw.description ?? "",
    });
  }
  return [...byId.values()];
}
