import { stripHtml } from "../normalize";
import { matchesAnyKeyword, primaryKeyword } from "../keywords";
import type { JobSource, RawJob } from "../types";
import { fetchJson, normalizeBasis, inferMode } from "./util";

interface MuseResponse {
  results?: {
    id: number;
    name: string;
    contents?: string;
    company?: { name?: string };
    locations?: { name?: string }[];
    type?: string;
    publication_date?: string;
    refs?: { landing_page?: string };
  }[];
}

/** The Muse — public jobs API with a location filter (works for both modes). */
export const themuse: JobSource = {
  id: "themuse",
  name: "The Muse",
  scope: "both",
  async search(params) {
    const url = new URL("https://www.themuse.com/api/public/jobs");
    url.searchParams.set("page", "1");
    if (params.mode === "local" && params.location) {
      url.searchParams.set("location", params.location);
    }
    const data = await fetchJson<MuseResponse>(url.toString());
    return (data.results ?? [])
      .filter((r) => r.name)
      .filter((r) =>
        matchesAnyKeyword(
          { title: r.name, company: r.company?.name ?? "", description: r.contents ?? "" },
          params.keywords,
        ),
      )
      .slice(0, 50)
      .map((r): RawJob => {
        const location = r.locations?.map((l) => l.name).filter(Boolean).join(", ") || "";
        return {
          title: r.name,
          company: r.company?.name ?? "",
          location,
          remoteType: inferMode(`${r.name} ${location}`),
          employmentType: normalizeBasis(r.type),
          description: stripHtml(r.contents ?? ""),
          url: r.refs?.landing_page ?? "",
          source: "The Muse",
          postedAt: r.publication_date,
        };
      });
  },
};
