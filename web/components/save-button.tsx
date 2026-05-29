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
        "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-semibold transition",
        isSaved ? "border-signal bg-signal text-white" : "border-line bg-white text-ink hover:border-signal",
        compact ? "h-9 w-9" : "px-4 py-2"
      ].join(" ")}
    >
      <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
      {compact ? <span className="sr-only">{isSaved ? labels.saved : labels.save}</span> : isSaved ? labels.saved : labels.save}
    </button>
  );
}
