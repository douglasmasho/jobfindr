import { stripHtml } from "../normalize";
import { matchesAnyKeyword } from "../keywords";
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
    return (data.data ?? [])
      .filter((r) =>
        matchesAnyKeyword(
          {
            title: r.title,
            company: r.company_name,
            description: r.description ?? "",
          },
          params.keywords,
        ),
      )
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
