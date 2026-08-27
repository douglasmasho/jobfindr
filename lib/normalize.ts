import type { Job, RawJob } from "./types";

function codePoint(code: number): string {
  try {
    return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
  } catch {
    return "";
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&rsquo;|&#8217;|&apos;/gi, "'")
    .replace(/&quot;|&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    .replace(/&#(\d+);/g, (_, n) => codePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => codePoint(parseInt(n, 16)));
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|tr|section|article|header|footer|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(
      /<\/?(?:p|div|span|strong|em|b|i|ul|ol|li|br|h[1-6]|section|article|header|footer|a|img|table|tr|td|th|tbody|thead|blockquote|pre|code|hr|font|center|figure|figcaption|main|nav)\b[^>]*/gi,
      " ",
    );
}

/** Strip HTML (including escaped tags) to readable text, preserving line breaks. */
export function stripHtml(html: string): string {
  if (!html) return "";
  let text = html;
  for (let i = 0; i < 3; i++) {
    const next = decodeEntities(stripTags(text));
    if (next === text) break;
    text = next;
  }
  return text
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Single-paragraph snippet for cards — HTML gone, whitespace collapsed. */
export function previewText(html: string): string {
  return stripHtml(html).replace(/\s+/g, " ").trim();
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
      title: stripHtml(title),
      company: stripHtml(raw.company ?? "").trim() || "Unknown company",
      location: stripHtml(raw.location ?? ""),
      salary: raw.salary ? stripHtml(raw.salary) : raw.salary,
      description: previewText(raw.description ?? ""),
    });
  }
  return [...byId.values()];
}
