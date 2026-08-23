import type { Job } from "./types";

const COLUMNS: { key: keyof Job; header: string }[] = [
  { key: "title", header: "Title" },
  { key: "company", header: "Company" },
  { key: "location", header: "Location" },
  { key: "remoteType", header: "Work mode" },
  { key: "employmentType", header: "Work basis" },
  { key: "salary", header: "Salary" },
  { key: "source", header: "Source" },
  { key: "postedAt", header: "Posted" },
  { key: "url", header: "Apply URL" },
];

function escape(value: unknown): string {
  const s = value == null ? "" : String(value);
  // Wrap in quotes if the value contains a comma, quote, or newline.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function jobsToCsv(jobs: Job[]): string {
  const header = COLUMNS.map((c) => c.header).join(",");
  const rows = jobs.map((job) => COLUMNS.map((c) => escape(job[c.key])).join(","));
  return [header, ...rows].join("\r\n");
}

/** Trigger a client-side CSV download of the given jobs. */
export function downloadJobsCsv(jobs: Job[], filename = "jobfindr-jobs.csv"): void {
  const csv = jobsToCsv(jobs);
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
