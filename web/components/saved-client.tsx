"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark } from "lucide-react";
import { LanguageToggle } from "./language-toggle";
import { Shell } from "./shell";
import { SignalCard } from "./signal-card";
import { copy } from "@/lib/i18n";
import { toDisplayItem } from "@/lib/format";
import type { FeedItem } from "@/lib/types";
import { useLanguage, useSavedIds } from "./use-preferences";

type Props = {
  items: FeedItem[];
};

export function SavedClient({ items }: Props) {
  const { language, setLanguage } = useLanguage();
  const { savedIds } = useSavedIds();
  const t = copy[language];

  const savedItems = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    return savedIds.flatMap((id) => {
      const item = byId.get(id);
      return item ? [toDisplayItem(item, language)] : [];
    });
  }, [items, language, savedIds]);

  return (
    <Shell language={language} rightSlot={<LanguageToggle language={language} setLanguage={setLanguage} />}>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-ink">{t.savedTitle}</h1>
            <p className="mt-2 text-sm text-muted">{savedItems.length} {t.signalCount}</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-muted shadow-sm"
          >
            <ArrowLeft size={16} />
            {t.backHome}
          </Link>
        </div>

        {savedItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {savedItems.map((item) => (
              <SignalCard
                key={item.id}
                item={item}
                language={language}
                labels={{
                  save: t.save,
                  saved: t.saved,
                  remove: t.remove,
                  sourceImage: t.sourceImage,
                  generatedImage: t.generatedImage
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-panel text-muted">
              <Bookmark size={22} />
            </div>
            <h2 className="mt-4 text-xl font-bold text-ink">{t.savedEmpty}</h2>
            <p className="mt-2 text-sm text-muted">{t.savedEmptyBody}</p>
          </div>
        )}
      </main>
    </Shell>
  );
}
