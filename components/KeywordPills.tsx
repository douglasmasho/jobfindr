"use client";

import { Plus, Search, X } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";

const CHIP_EXIT_MS = 220;

export type KeywordPillsHandle = {
  /** Add pending draft as a pill; returns the full keyword list. */
  commitPending: () => string[];
};

function useKeywordActions(
  keywords: string[],
  onChange: (next: string[]) => void,
) {
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const exitTimers = useRef<Map<string, number>>(new Map());
  const keywordsRef = useRef(keywords);
  keywordsRef.current = keywords;

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

  return { exiting, removeKeyword };
}

export function KeywordPillStrip({
  keywords,
  onChange,
  disabled,
}: {
  keywords: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const { exiting, removeKeyword } = useKeywordActions(keywords, onChange);

  if (!keywords.length) return null;

  return (
    <div className="scrollbar-green -mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex w-max flex-nowrap gap-2">
        {keywords.map((keyword, i) => (
          <button
            key={keyword}
            type="button"
            disabled={disabled}
            className={`chip shrink-0 ${exiting.has(keyword) ? "animate-chip-out" : "animate-pop-in"}`}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            onClick={() => removeKeyword(keyword)}
          >
            {keyword} <X className="h-3 w-3" />
          </button>
        ))}
      </div>
    </div>
  );
}

export const KeywordPills = forwardRef<
  KeywordPillsHandle,
  {
    keywords: string[];
    onChange: (next: string[]) => void;
    disabled?: boolean;
  }
>(function KeywordPills({ keywords, onChange, disabled }, ref) {
  const [draft, setDraft] = useState("");
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

  useImperativeHandle(ref, () => ({
    commitPending: () => addKeyword(draft),
  }));

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword(draft);
    }
  }

  const canAdd = draft.trim().length > 0 && !disabled;

  const addButtonClass =
    "btn-press shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex-1 text-sm">
      <span className="mb-1 block font-medium text-slate-700">Keywords</span>
      <div className="flex items-stretch gap-2">
        <div className="field flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line px-3">
          <Search className="h-4 w-4 shrink-0 text-mute" />
          <input
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            enterKeyHint="done"
            placeholder={keywords.length ? "Add another keyword…" : "systems administrator"}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => addKeyword(draft)}
          aria-label="Add keyword"
          className={`${addButtonClass} hidden h-11 w-11 lg:inline-flex`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        disabled={!canAdd}
        onClick={() => addKeyword(draft)}
        className={`${addButtonClass} mt-2 inline-flex h-9 w-full gap-1.5 px-3 text-sm font-semibold lg:hidden`}
      >
        <Plus className="h-4 w-4" />
        Add keyword
      </button>
    </div>
  );
});
