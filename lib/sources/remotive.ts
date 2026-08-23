import { stripHtml } from "../normalize";
import type { JobSource, RawJob } from "../types";
import { fetchJson, inferBasis } from "./util";

interface RemotiveResponse {
  jobs?: {
    id: number;
    title: string;
    company_name: string;
    company_logo?: string;
    candidate_required_location?: string;
    job_type?: string;
    publication_date?: string;
    salary?: string;
    url: string;
    description: string;
  }[];
}

/** Remotive — remote jobs API with server-side keyword search. */
export const remotive: JobSource = {
  id: "remotive",
  name: "Remotive",
  scope: "remote",
  async search(params) {
    const q = encodeURIComponent(params.keywords.trim());
    const data = await fetchJson<RemotiveResponse>(
      `https://remotive.com/api/remote-jobs${q ? `?search=${q}` : ""}`,
    );
    return (data.jobs ?? []).slice(0, 60).map(
      (j): RawJob => ({
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Remote",
        remoteType: "remote",
        employmentType: inferBasis(j.job_type ?? ""),
        description: stripHtml(j.description ?? ""),
        url: j.url,
        source: "Remotive",
        postedAt: j.publication_date,
        salary: j.salary || undefined,
      }),
    );
  },
};
