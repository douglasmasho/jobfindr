"use client";

import { Download, Globe, Loader2, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { JobList } from "@/components/JobList";
import { COUNTRIES, WORK_BASES, WORK_MODES } from "@/lib/constants";
import { downloadJobsCsv } from "@/lib/csv";
import type { CacheStats, Job, Mode, SearchParams, SearchResponse, SourceRun, WorkBasis, WorkMode } from "@/lib/types";

export default function Home() {
  const [mode, setMode] = useState<Mode>("local");
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState<string>(COUNTRIES[0]);
  const [workMode, setWorkMode] = useState<WorkMode | "any">("any");
  const [workBasis, setWorkBasis] = useState<WorkBasis | "any">("any");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [sources, setSources] = useState<SourceRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [searchKey, setSearchKey] = useState(0);
  const [cache, setCache] = useState<CacheStats | null>(null);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: SearchParams = { mode, keywords, location, workMode, workBasis };
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = (await res.json()) as SearchResponse;
      setJobs(data.jobs);
      setSources(data.sources);
      setCache(data.cache ?? null);
      setSearched(true);
      setSearchKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setJobs([]);
      setSources([]);
      setCache(null);
    } finally {
      setLoading(false);
    }
  }

  const okSources = sources.filter((s) => s.status === "ok").length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="animate-fade-up mb-6">
        <h1 className="sr-only">Jobfindr</h1>
        <img
          src="/logo.svg"
          alt="Jobfindr"
          width={258}
          height={59}
          className="h-5 w-auto sm:h-10"
        />
        <p className="mt-2 text-sm text-mute">
          Aggregate jobs from multiple boards, filter to what you want, export to CSV.
        </p>
      </header>

      <form
        onSubmit={runSearch}
        className="animate-pop-in relative overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5"
        style={{ animationDelay: "80ms" }}
      >
        {loading ? <div className="searching-bar absolute inset-x-0 top-0 h-0.5" /> : null}

        <div className="relative mb-4 grid w-56 grid-cols-2 rounded-xl border border-line bg-canvas p-1 text-sm font-medium">
          <span
            className="pointer-events-none absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-accent shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              left: 4,
              transform: mode === "local" ? "translateX(0)" : "translateX(100%)",
            }}
          />
          <button
            type="button"
            onClick={() => setMode("local")}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors duration-200 ${
              mode === "local" ? "text-white" : "text-mute hover:text-ink"
            }`}
          >
            <MapPin className={`h-4 w-4 transition-transform duration-300 ${mode === "local" ? "scale-110" : ""}`} />
            Local
          </button>
          <button
            type="button"
            onClick={() => setMode("remote")}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors duration-200 ${
              mode === "remote" ? "text-white" : "text-mute hover:text-ink"
            }`}
          >
            <Globe className={`h-4 w-4 transition-transform duration-300 ${mode === "remote" ? "scale-110" : ""}`} />
            Remote
          </button>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-slate-700">Keywords</span>
            <div className="field flex h-11 items-center gap-2 rounded-xl border border-line px-3">
              <Search className="h-4 w-4 text-mute transition-colors duration-200" />
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. accountant, react developer"
                className="h-full w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>

          {mode === "local" ? (
            <label className="animate-field-in text-sm lg:w-52">
              <span className="mb-1 block font-medium text-slate-700">Location</span>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="field h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="text-sm lg:w-44">
            <span className="mb-1 block font-medium text-slate-700">Work mode</span>
            <select
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value as WorkMode | "any")}
              className="field h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none"
            >
              {WORK_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm lg:w-40">
            <span className="mb-1 block font-medium text-slate-700">Work basis</span>
            <select
              value={workBasis}
              onChange={(e) => setWorkBasis(e.target.value as WorkBasis | "any")}
              className="field h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none"
            >
              {WORK_BASES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn-press inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="animate-fade-up mt-4 text-sm text-red-600">{error}</p>
      ) : null}

      {loading ? (
        <section className="mt-6 grid gap-3 sm:grid-cols-2" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-fade-up h-40 rounded-xl border border-line bg-white p-4"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="h-4 w-3/5 rounded bg-slate-100" />
              <div className="mt-3 h-3 w-2/5 rounded bg-slate-100" />
              <div className="mt-5 h-3 w-full rounded bg-slate-50" />
              <div className="mt-2 h-3 w-4/5 rounded bg-slate-50" />
            </div>
          ))}
        </section>
      ) : null}

      {searched && !loading ? (
        <section className="animate-fade-up mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                {jobs.length} {jobs.length === 1 ? "job" : "jobs"} found
              </h2>
              <p className="text-xs text-mute">
                {okSources} of {sources.length} sources responded
                {mode === "local" ? ` · ${location}` : " · remote"}
                {cache && (cache.fromCache > 0 || cache.fromLive > 0)
                  ? ` · ${cache.fromCache} from cache · ${cache.fromLive} new`
                  : ""}
              </p>
            </div>
            <button
              onClick={() => downloadJobsCsv(jobs)}
              disabled={!jobs.length}
              className="btn-press inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50 disabled:shadow-none"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>

          {jobs.length ? (
            <JobList key={searchKey} jobs={jobs} />
          ) : (
            <p className="animate-pop-in rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-mute">
              No jobs matched. Try broader keywords, switch to Remote mode, or a different location.
            </p>
          )}
        </section>
      ) : null}
    </main>
  );
}
