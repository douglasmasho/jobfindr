import { matchesAnyKeyword } from "./keywords";
import type { Job, SearchParams } from "./types";

const OTHER_PLACE =
  /\b(u\.?s\.?a?|united states|americas?|north america|latam|canada|u\.?k\.?|united kingdom|england|ireland|europe|european|emea|eu only|apac|asia|india|australia|new zealand|germany|france|netherlands|spain|italy|poland|brazil|mexico|singapore|philippines|nigeria|kenya|egypt|south africa)\b/;

/** Keep only jobs that match every parameter the user set. */
export function applyFilters(jobs: Job[], params: SearchParams): Job[] {
  const country = params.location.trim().toLowerCase();

  return jobs.filter((job) => {
    if (params.keywords.length && !matchesAnyKeyword(job, params.keywords)) return false;
    if (params.workMode !== "any" && job.remoteType && job.remoteType !== params.workMode) {
      return false;
    }
    if (params.workBasis !== "any" && job.employmentType && job.employmentType !== params.workBasis) {
      return false;
    }
    if (params.mode === "local" && country) {
      if (!matchesCountry(job, country)) return false;
    }
    return true;
  });
}

function matchesCountry(job: Job, country: string): boolean {
  const loc = `${job.country ?? ""} ${job.location ?? ""}`.toLowerCase();
  if (loc.includes(country)) return true;
  if (job.remoteType === "remote") {
    const worldwide = !loc.trim() || /worldwide|anywhere|global|international/.test(loc);
    return worldwide || !OTHER_PLACE.test(loc);
  }
  return false;
}
