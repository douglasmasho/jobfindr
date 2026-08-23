"use client";

import { Search, X } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";

const CHIP_EXIT_MS = 220;

export type KeywordPillsHandle = {
  /** Add pending draft as a pill; returns the full keyword list. */
  commitPending: () => string[];
};

export const KeywordPills = forwardRef<
  KeywordPillsHandle,
  {
    keywords: string[];
    onChange: (next: string[]) => void;
    disabled?: boolean;
  }
>(function KeywordPills({ keywords, onChange, disabled }, ref) {
  const [draft, setDraft] = useState("");
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const exitTimers = useRef<Map<string, number>>(new Map());
  const keywordsRef = useRef(keywords);
  keywordsRef.current = keywords;

  function addKeyword(value: string): string[] {
    const pill = value.trim().replace(/\s+/g, " ");
    if (!pill) return keywordsRef.current;
    if (keywordsRef.current.includes(pill)) {
      setDraft("");
      return keywordsRef.current;
    }
    const next = [...keywordsRef.current, pill];
    onChange(next);
    setDraft("");
    return next;
  }

  function removeKeyword(keyword: string) {
    if (exiting.has(keyword)) return;
    setExiting((prev) => new Set(prev).add(keyword));
    const timer = window.setTimeout(() => {
      onChange(keywordsRef.current.filter((k) => k !== keyword));
      setExiting((prev) => {
        const next = new Set(prev);
        next.delete(keyword);
        return next;
      });
      exitTimers.current.delete(keyword);
    }, CHIP_EXIT_MS);
    exitTimers.current.set(keyword, timer);
  }

  useImperativeHandle(ref, () => ({
    commitPending: () => addKeyword(draft),
  }));

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword(draft);
    }
    if (e.key === "Backspace" && !draft && keywords.length) {
      removeKeyword(keywords[keywords.length - 1]!);
    }
  }

  return (
    <div className="flex-1 text-sm">
      <span className="mb-1 block font-medium text-slate-700">Keywords</span>
      <div className="field flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-mute" />
        {keywords.map((keyword, i) => (
          <button
            key={keyword}
            type="button"
            disabled={disabled}
            className={`chip ${exiting.has(keyword) ? "animate-chip-out" : "animate-pop-in"}`}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            onClick={() => removeKeyword(keyword)}
          >
            {keyword} <X className="h-3 w-3" />
          </button>
        ))}
        <input
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={keywords.length ? "Add another keyword…" : "e.g. systems administrator"}
          className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      <p className="mt-1 text-[11px] text-mute">
        Enter adds a phrase pill. Each pill is one search query — stack several to broaden results.
      </p>
    </div>
  );
});
