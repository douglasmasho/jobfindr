import { stripHtml } from "../normalize";
import type { JobSource, RawJob } from "../types";
import { fetchJson, inferBasis, inferMode } from "./util";

interface ArbeitnowResponse {
  data?: {
    slug: string;
    title: string;
    company_name: string;
    location?: string;
    remote?: boolean;
    job_types?: string[];
    tags?: string[];
    description?: string;
    url: string;
    created_at?: number;
  }[];
}

/** Arbeitnow — public board (mostly EU + remote); client-filter by keywords. */
export const arbeitnow: JobSource = {
  id: "arbeitnow",
  name: "Arbeitnow",
  scope: "remote",
  async search(params) {
    const data = await fetchJson<ArbeitnowResponse>("https://www.arbeitnow.com/api/job-board-api");
    const terms = params.keywords.toLowerCase().split(/[\s,]+/).filter(Boolean);
    return (data.data ?? [])
      .filter((r) => {
        if (!terms.length) return true;
        const hay = `${r.title} ${r.company_name} ${(r.tags ?? []).join(" ")}`.toLowerCase();
        return terms.some((t) => hay.includes(t));
      })
      .slice(0, 60)
      .map(
        (r): RawJob => ({
          title: r.title,
          company: r.company_name,
          location: r.location || (r.remote ? "Remote" : ""),
          remoteType: r.remote ? "remote" : inferMode(`${r.title} ${r.location ?? ""}`),
          employmentType: inferBasis((r.job_types ?? []).join(" ")),
          description: stripHtml(r.description ?? ""),
          url: r.url,
          source: "Arbeitnow",
          postedAt: r.created_at ? new Date(r.created_at * 1000).toISOString() : undefined,
        }),
      );
  },
};
