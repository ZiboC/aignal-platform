"use client";

import { Bookmark } from "lucide-react";
import { useSavedIds } from "./use-preferences";

type Props = {
  itemId: string;
  compact?: boolean;
  labels: {
    save: string;
    saved: string;
    remove: string;
  };
};

export function SaveButton({ itemId, compact = false, labels }: Props) {
  const { savedSet, toggleSaved } = useSavedIds();
  const isSaved = savedSet.has(itemId);

  return (
    <button
      type="button"
      aria-label={isSaved ? labels.remove : labels.save}
      title={isSaved ? labels.remove : labels.save}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSaved(itemId);
      }}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-sm border text-sm font-black uppercase transition",
        isSaved ? "border-source bg-source text-obsidian" : "border-white/25 bg-white/10 text-ink hover:border-signal hover:bg-signal/12",
        compact ? "h-9 w-9" : "px-4 py-2"
      ].join(" ")}
    >
      <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
      {compact ? <span className="sr-only">{isSaved ? labels.saved : labels.save}</span> : isSaved ? labels.saved : labels.save}
    </button>
  );
}
