import { stripHtml } from "../normalize";
import type { JobSource, RawJob } from "../types";
import { fetchJson } from "./util";

interface RemoteOkJob {
  id?: string;
  slug?: string;
  position?: string;
  company?: string;
  company_logo?: string;
  location?: string;
  tags?: string[];
  description?: string;
  url?: string;
  apply_url?: string;
  date?: string;
  salary_min?: number;
  salary_max?: number;
}

/** Remote OK — single public dump; we client-filter by keywords. */
export const remoteok: JobSource = {
  id: "remoteok",
  name: "Remote OK",
  scope: "remote",
  async search(params) {
    const rows = await fetchJson<RemoteOkJob[]>("https://remoteok.com/api");
    const terms = params.keywords.toLowerCase().split(/[\s,]+/).filter(Boolean);
    const jobs = rows
      .filter((r) => r.position && r.company)
      .filter((r) => {
        if (!terms.length) return true;
        const hay = `${r.position} ${r.company} ${(r.tags ?? []).join(" ")}`.toLowerCase();
        return terms.some((t) => hay.includes(t));
      })
      .slice(0, 60)
      .map(
        (r): RawJob => ({
          title: r.position!,
          company: r.company!,
          location: r.location || "Remote",
          remoteType: "remote",
          description: stripHtml(r.description ?? ""),
          url: r.url || r.apply_url || `https://remoteok.com/l/${r.id ?? r.slug ?? ""}`,
          source: "Remote OK",
          postedAt: r.date,
          salary:
            r.salary_min || r.salary_max
              ? `${r.salary_min ?? "?"}–${r.salary_max ?? "?"}`
              : undefined,
        }),
      );
    return jobs;
  },
};
