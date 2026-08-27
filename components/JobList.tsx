import { Building2, ExternalLink, MapPin } from "lucide-react";
import { previewText } from "@/lib/normalize";
import type { Job } from "@/lib/types";

const MODE_LABEL: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  "on-site": "On-site",
};

export function JobList({ jobs }: { jobs: Job[] }) {
  return (
    <ul className="grid w-full min-w-0 gap-3 sm:grid-cols-2">
      {jobs.map((job, index) => {
        const description = previewText(job.description);
        return (
          <li
            key={job.id}
            className="job-card flex min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-line bg-white p-4 shadow-sm"
            style={{ animationDelay: `${Math.min(index, 16) * 45}ms` }}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <h3 className="min-w-0 break-words font-semibold leading-snug text-ink">{job.title}</h3>
              <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-dark">
                {job.source}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-mute">
              <span className="inline-flex min-w-0 max-w-full items-center gap-1 break-words">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 break-words">{job.company}</span>
              </span>
              {job.location ? (
                <span className="inline-flex min-w-0 max-w-full items-center gap-1 break-words">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 break-words">{job.location}</span>
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex min-w-0 flex-wrap gap-1.5 text-[11px]">
              {job.remoteType ? (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                  {MODE_LABEL[job.remoteType]}
                </span>
              ) : null}
              {job.employmentType ? (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                  {job.employmentType}
                </span>
              ) : null}
              {job.salary ? (
                <span className="max-w-full break-words rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                  {job.salary}
                </span>
              ) : null}
            </div>
            {description ? (
              <p className="mt-2 min-w-0 overflow-hidden break-words text-sm text-slate-600 [overflow-wrap:anywhere] line-clamp-3">
                {description}
              </p>
            ) : null}
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="apply-link mt-3 inline-flex items-center gap-1 self-start text-sm font-medium text-accent hover:text-accent-dark"
            >
              View &amp; apply <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
