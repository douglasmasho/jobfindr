import { stripHtml } from "../normalize";
import { primaryKeyword } from "../keywords";
import type { JobSource, RawJob } from "../types";
import { fetchJson } from "./util";

interface AdzunaResponse {
  results?: {
    id?: string | number;
    title?: string;
    description?: string;
    company?: { display_name?: string };
    location?: { display_name?: string; area?: string[] };
    redirect_url?: string;
    created?: string;
    salary_min?: number;
    salary_max?: number;
    contract_time?: string;
  }[];
}

/** ISO alpha-2 codes for countries Adzuna covers. */
const ADZUNA_COUNTRIES: Record<string, string> = {
  "south africa": "za",
  "united kingdom": "gb",
  ireland: "ie",
  germany: "de",
  canada: "ca",
  "united states": "us",
  australia: "au",
  netherlands: "nl",
  france: "fr",
  india: "in",
  singapore: "sg",
  poland: "pl",
  brazil: "br",
  mexico: "mx",
};

/** Adzuna — free developer tier, strong for local/country jobs. Needs keys. */
export const adzuna: JobSource = {
  id: "adzuna",
  name: "Adzuna",
  scope: "local",
  async search(params) {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) return [];
    const cc = ADZUNA_COUNTRIES[params.location.trim().toLowerCase()];
    if (!cc) return [];

    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${cc}/search/1`);
    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    url.searchParams.set("results_per_page", "50");
    url.searchParams.set("what", primaryKeyword(params.keywords));
    url.searchParams.set("content-type", "application/json");

    const data = await fetchJson<AdzunaResponse>(url.toString());
    return (data.results ?? []).map(
      (r): RawJob => ({
        title: r.title ?? "",
        company: r.company?.display_name ?? "",
        location: r.location?.display_name ?? params.location,
        country: params.location,
        remoteType: /remote/i.test(`${r.title} ${r.description}`) ? "remote" : "on-site",
        employmentType: r.contract_time === "part_time" ? "part-time" : "full-time",
        description: stripHtml(r.description ?? ""),
        url: r.redirect_url ?? "",
        source: "Adzuna",
        postedAt: r.created,
        salary:
          r.salary_min || r.salary_max ? `${r.salary_min ?? "?"}–${r.salary_max ?? "?"}` : undefined,
      }),
    );
  },
};
