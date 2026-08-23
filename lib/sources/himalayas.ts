import { stripHtml } from "../normalize";
import type { JobSource, RawJob } from "../types";
import { fetchJson, inferBasis } from "./util";

interface HimalayasResponse {
  jobs?: {
    guid?: string;
    title?: string;
    companyName?: string;
    description?: string;
    applicationLink?: string;
    pubDate?: number;
    locationRestrictions?: string[];
    employmentType?: string;
    categories?: string[];
  }[];
}

/** Himalayas — keyless remote board; client-filter by keywords. */
export const himalayas: JobSource = {
  id: "himalayas",
  name: "Himalayas",
  scope: "remote",
  async search(params) {
    const data = await fetchJson<HimalayasResponse>("https://himalayas.app/jobs/api?limit=100");
    const terms = params.keywords.toLowerCase().split(/[\s,]+/).filter(Boolean);
    return (data.jobs ?? [])
      .filter((j) => j.title)
      .filter((j) => {
        if (!terms.length) return true;
        const hay = `${j.title} ${j.companyName} ${(j.categories ?? []).join(" ")}`.toLowerCase();
        return terms.some((t) => hay.includes(t));
      })
      .slice(0, 60)
      .map((j): RawJob => {
        const restrictions = j.locationRestrictions ?? [];
        const worldwide = restrictions.length === 0 || restrictions.some((r) => /worldwide|anywhere/i.test(r));
        return {
          title: j.title!,
          company: j.companyName ?? "",
          location: worldwide ? "Worldwide" : restrictions.join(", "),
          country: worldwide ? undefined : restrictions[0],
          remoteType: "remote",
          employmentType: inferBasis(j.employmentType ?? ""),
          description: stripHtml(j.description ?? ""),
          url: j.applicationLink ?? "",
          source: "Himalayas",
          postedAt: j.pubDate ? new Date(j.pubDate * 1000).toISOString() : undefined,
        };
      });
  },
};
