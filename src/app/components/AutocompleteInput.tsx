"use client";

import { useMemo, useState } from "react";

export default function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (query.length < 2) return [];
    // Strip spaces/hyphens on both sides so "cheese ca" still matches
    // "Cheesecake", and "e mail" would match "E-Mail", etc.
    const normalize = (s: string) => s.toLowerCase().replace(/[\s-]+/g, "");
    const normalizedQuery = normalize(query);
    return suggestions
      .filter((s) => normalize(s).includes(normalizedQuery))
      .sort((a, b) => {
        const aStarts = normalize(a).startsWith(normalizedQuery) ? 0 : 1;
        const bStarts = normalize(b).startsWith(normalizedQuery) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.length - b.length;
      })
      .slice(0, 6);
  }, [value, suggestions]);

  const showDropdown = focused && matches.length > 0;

  function selectSuggestion(s: string) {
    onChange(s);
    setFocused(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && matches[highlighted]) {
      e.preventDefault();
      selectSuggestion(matches[highlighted]);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlighted(0);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-hairline bg-elevated shadow-xl">
          {matches.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectSuggestion(s)}
              className={`block w-full px-3 py-2 text-left text-sm ${
                i === highlighted ? "bg-brand/20 text-brand-soft" : "text-surface"
              } hover:bg-brand/20 hover:text-brand-soft`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
