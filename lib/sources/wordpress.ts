import { stripHtml } from "../normalize";
import type { JobSource, RawJob } from "../types";
import { fetchJson } from "./util";

interface WpPost {
  id?: number;
  date?: string;
  link?: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
}

const ARTICLE_RE =
  /\b(how to|guide|tips|why |what is|best \d|top \d+|ultimate|complete guide|cv |resume|interview|checklist|salary guide|explained|highest[- ]?paying|paying jobs|list of|career advice|qualifications?|companies hiring)\b|\(20\d\d\s*[-–—]\s*20\d\d\)/i;

/**
 * Many small country job boards run on WordPress and expose the standard REST
 * API (`/wp-json/wp/v2/posts` with server-side `search`). This is how we get
 * *local, on-site* jobs the international remote boards never carry. Only runs
 * when the board's country is selected.
 */
export function wordpressBoard(opts: {
  id: string;
  name: string;
  baseUrl: string;
  country: string;
  cities?: readonly string[];
}): JobSource {
  const cityRe = opts.cities?.length ? new RegExp(`\\b(${opts.cities.join("|")})\\b`, "i") : null;
  return {
    id: opts.id,
    name: opts.name,
    scope: "local",
    async search(params) {
      if (params.location.trim().toLowerCase() !== opts.country.toLowerCase()) return [];
      const url = new URL(`${opts.baseUrl}/wp-json/wp/v2/posts`);
      url.searchParams.set("per_page", "50");
      url.searchParams.set("_fields", "id,date,link,title,content");
      if (params.keywords.trim()) url.searchParams.set("search", params.keywords.trim());

      const posts = await fetchJson<WpPost[]>(url.toString());
      return posts
        .filter((p) => !ARTICLE_RE.test(stripHtml(p.title?.rendered ?? "")))
        .map((p): RawJob => {
          const rawTitle = stripHtml(p.title?.rendered ?? "").trim();
          const description = stripHtml(p.content?.rendered ?? "");
          const city = cityRe?.exec(`${rawTitle} ${description}`)?.[1];
          return {
            title: cleanTitle(rawTitle),
            company: extractCompany(rawTitle) ?? "",
            location: city ? `${titleCase(city)}, ${opts.country}` : opts.country,
            country: opts.country,
            remoteType: "on-site",
            description,
            url: p.link ?? "",
            source: opts.name,
            postedAt: p.date,
          };
        })
        .filter((j) => j.title.length > 0);
    },
  };
}

function extractCompany(title: string): string | undefined {
  const at = title.match(/\bat\s+([A-Z][A-Za-z0-9&.,'()\s]{2,60}?)(?:\s[–\-—|:]|\s+apply\b|$)/i);
  if (at?.[1]) return tidy(at[1]);
  const dash = title.match(/[–\-—]\s*([A-Z][A-Za-z0-9&.,'()\s]{2,60}?)(?:\s*[–\-—|:]|\s+apply\b|$)/i);
  if (dash?.[1]) return tidy(dash[1]);
  return undefined;
}

function tidy(value: string): string | undefined {
  const v = value.trim().replace(/\s+/g, " ");
  if (/\b(level|experience|manager|managerial|accountant|engineer|officer|assistant)\b/i.test(v)) {
    return undefined;
  }
  return v || undefined;
}

function cleanTitle(title: string): string {
  return title
    .replace(/^new\s+(job|jobs|vacancy|vacancies)\s+(at|for)\s+/i, "")
    .replace(/\s*[–\-—|:]?\s*apply\s+(by|before|now).*$/i, "")
    .trim()
    .slice(0, 120);
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const NAMIBIA_CITIES = [
  "Windhoek", "Walvis Bay", "Swakopmund", "Oshakati", "Rundu", "Rehoboth",
  "Otjiwarongo", "Katima Mulilo", "Ondangwa", "Grootfontein", "Mariental",
  "Keetmanshoop", "Tsumeb", "Gobabis", "Okahandja", "Henties Bay", "Luderitz",
] as const;

export const namibiaBoards: JobSource[] = [
  wordpressBoard({
    id: "najobs",
    name: "NaJobs",
    baseUrl: "https://najobs.info",
    country: "Namibia",
    cities: NAMIBIA_CITIES,
  }),
  wordpressBoard({
    id: "jobsinnamibia",
    name: "Jobs in Namibia",
    baseUrl: "https://jobsinnamibia.info",
    country: "Namibia",
    cities: NAMIBIA_CITIES,
  }),
];
