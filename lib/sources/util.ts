import type { WorkBasis, WorkMode } from "../types";

export function inferMode(text: string, fallback?: WorkMode): WorkMode | undefined {
  const t = text.toLowerCase();
  if (/\bhybrid\b/.test(t)) return "hybrid";
  if (/\bremote\b|work from home|wfh|anywhere/.test(t)) return "remote";
  if (/\bon[-\s]?site\b|in[-\s]?office|on premise/.test(t)) return "on-site";
  return fallback;
}

export function inferBasis(text: string, fallback?: WorkBasis): WorkBasis | undefined {
  const t = text.toLowerCase();
  if (/\bintern(ship)?\b/.test(t)) return "internship";
  if (/\bpart[-\s]?time\b/.test(t)) return "part-time";
  if (/\bcontract|freelance|temporary|fixed[-\s]?term\b/.test(t)) return "contract";
  if (/\bfull[-\s]?time\b/.test(t)) return "full-time";
  return fallback;
}

export function normalizeBasis(value?: string): WorkBasis | undefined {
  const v = (value ?? "").toLowerCase();
  if (!v) return undefined;
  if (v.includes("intern")) return "internship";
  if (v.includes("part")) return "part-time";
  if (v.includes("contract") || v.includes("temporary") || v.includes("freelance")) return "contract";
  if (v.includes("full")) return "full-time";
  return undefined;
}

/** Fetch JSON with a hard timeout so a slow board can't hang the search. */
export async function fetchJson<T>(url: string, timeoutMs = 12_000, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "jobfindr/0.1", ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
