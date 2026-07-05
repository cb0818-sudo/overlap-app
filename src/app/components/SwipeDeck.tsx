"use client";

import { useState } from "react";
import { Heart, X, Undo2 } from "lucide-react";
import SwipeCard, { type SwipeItem } from "./SwipeCard";

export default function SwipeDeck({
  items,
  totalCount,
  onSwipe,
  onUndo,
  canUndo,
}: {
  /** remaining items this participant hasn't swiped on yet, in a stable order */
  items: SwipeItem[];
  /** total options in the room, for the progress bar */
  totalCount: number;
  onSwipe: (itemId: string, direction: "like" | "skip") => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  const [exiting, setExiting] = useState<{ item: SwipeItem; direction: "like" | "skip" } | null>(
    null
  );

  function triggerSwipe(item: SwipeItem, direction: "like" | "skip") {
    if (exiting) return;
    setExiting({ item, direction });
    onSwipe(item.id, direction);
    window.setTimeout(() => setExiting(null), 340);
  }

  const stack = exiting ? [exiting.item, ...items.filter((i) => i.id !== exiting.item.id)] : items;
  const visible = stack.slice(0, 3);
  const completed = totalCount - items.length;
  const done = items.length === 0 && !exiting;

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Swiping
          </span>
          <span className="font-mono text-xs text-muted">
            {Math.min(completed, totalCount)} / {totalCount}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300 ease-out"
            style={{ width: `${totalCount ? (completed / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="relative mx-6 mt-6 flex-1">
        {done ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 h-2 w-2 animate-pulse rounded-full bg-lime" />
            <h2 className="font-display text-xl font-extrabold text-surface">
              You&apos;re all caught up
            </h2>
            <p className="mt-2 max-w-[240px] text-sm text-surface/70">
              Waiting on everyone else to finish swiping. This reveals the
              second there&apos;s a match.
            </p>
            {canUndo && (
              <button
                onClick={onUndo}
                className="mt-4 flex items-center gap-1.5 rounded-full border border-hairline bg-raise-1 px-3 py-1.5 font-mono text-xs text-muted hover:text-surface"
              >
                <Undo2 size={13} />
                Undo last swipe
              </button>
            )}
          </div>
        ) : (
          visible.map((item, i) => (
            <SwipeCard
              key={item.id}
              item={item}
              active={i === 0 && !exiting}
              stackPosition={i}
              onSwiped={(direction) => triggerSwipe(item, direction)}
              forcedDirection={exiting && item.id === exiting.item.id ? exiting.direction : null}
            />
          ))
        )}
      </div>

      {!done && (
        <div className="flex items-center justify-center gap-6 px-6 py-8">
          <button
            onClick={() => items[0] && triggerSwipe(items[0], "skip")}
            aria-label="Skip"
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-coral/60 bg-raise-1 text-coral transition-transform active:scale-90"
          >
            <X size={28} strokeWidth={2.5} />
          </button>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo last swipe"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-raise-1 text-muted transition-transform active:scale-90 disabled:opacity-30"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={() => items[0] && triggerSwipe(items[0], "like")}
            aria-label="Like"
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-lime/60 bg-raise-1 text-lime transition-transform active:scale-90"
          >
            <Heart size={26} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
