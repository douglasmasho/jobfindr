export type Mode = "local" | "remote";
export type WorkMode = "remote" | "hybrid" | "on-site";
export type WorkBasis = "full-time" | "part-time" | "contract" | "internship";

/** A normalized job listing returned to the client. */
export interface Job {
  id: string; // fingerprint
  title: string;
  company: string;
  location: string;
  country?: string;
  remoteType?: WorkMode;
  employmentType?: WorkBasis;
  description: string;
  url: string;
  source: string;
  postedAt?: string;
  salary?: string;
}

/** A source's raw output before fingerprinting/dedupe. */
export type RawJob = Omit<Job, "id">;

export interface SearchParams {
  mode: Mode;
  keywords: string;
  /** Country name, only meaningful in local mode. */
  location: string;
  workMode: WorkMode | "any";
  workBasis: WorkBasis | "any";
}

export interface SourceRun {
  id: string;
  name: string;
  status: "ok" | "failed" | "unavailable";
  count: number;
}

export interface CacheStats {
  fromCache: number;
  fromLive: number;
}

export interface SearchResponse {
  jobs: Job[];
  sources: SourceRun[];
  cache?: CacheStats;
}

export interface JobSource {
  id: string;
  name: string;
  /** Which mode(s) this source contributes to. */
  scope: Mode | "both";
  search(params: SearchParams): Promise<RawJob[]>;
}
