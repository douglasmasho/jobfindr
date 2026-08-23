import type { WorkBasis, WorkMode } from "./types";

/**
 * Location options for local mode. Namibia has dedicated local boards; the rest
 * resolve via Adzuna (when keys are set) or The Muse. Namibia is the default.
 */
export const COUNTRIES = [
  "Namibia",
  "South Africa",
  "United Kingdom",
  "United States",
  "Canada",
  "Germany",
  "Ireland",
  "Netherlands",
  "France",
  "Australia",
  "India",
  "Singapore",
  "Nigeria",
  "Kenya",
] as const;

export const WORK_MODES: { value: WorkMode | "any"; label: string }[] = [
  { value: "any", label: "Any work mode" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on-site", label: "On-site" },
];

export const WORK_BASES: { value: WorkBasis | "any"; label: string }[] = [
  { value: "any", label: "Any basis" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];
