"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { LanguageToggle } from "./language-toggle";
import { Shell } from "./shell";
import { SignalCard } from "./signal-card";
import { CategoryIcon, categories, categoryLabel } from "@/lib/categories";
import { copy } from "@/lib/i18n";
import { toDisplayItem } from "@/lib/format";
import { filterItems } from "@/lib/search";
import type { FeedArchive, NewsCategory } from "@/lib/types";
import { useLanguage } from "./use-preferences";

type Props = {
  archive: FeedArchive;
};

export function DashboardClient({ archive }: Props) {
  const { language, setLanguage } = useLanguage();
  const t = copy[language];
  const [selectedDate, setSelectedDate] = useState(archive.dates[0] ?? "");
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | "all">("all");
  const [query, setQuery] = useState("");

  const rawItems = useMemo(() => archive.feedsByDate[selectedDate] ?? [], [archive.feedsByDate, selectedDate]);
  const displayItems = useMemo(() => rawItems.map((item) => toDisplayItem(item, language)), [rawItems, language]);
  const filteredItems = useMemo(
    () => filterItems(displayItems, query, selectedCategory),
    [displayItems, query, selectedCategory]
  );

  const sourceCount = new Set(rawItems.map((item) => item.source_name)).size;
  const sourceImageCount = rawItems.filter((item) => item.image_source === "source").length;

  return (
    <Shell language={language} rightSlot={<LanguageToggle language={language} setLanguage={setLanguage} />}>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-4xl font-bold tracking-normal text-ink sm:text-5xl">{t.heroTitle}</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{t.heroSubtitle}</p>
              </div>
              <div className="grid w-full min-w-0 grid-cols-3 gap-2 text-center md:w-auto">
                <Metric value={String(rawItems.length)} label={t.signalCount} />
                <Metric value={String(sourceCount)} label="Sources" />
                <Metric value={String(sourceImageCount)} label="Images" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-ink p-5 text-white shadow-soft">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-white/60">
              <CalendarDays size={16} />
              {t.dateArchive}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {archive.dates.map((date, index) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={[
                    "rounded-md px-3 py-2 text-sm font-bold transition",
                    selectedDate === date ? "bg-white text-ink" : "bg-white/10 text-white hover:bg-white/18"
                  ].join(" ")}
                >
                  {index === 0 ? t.latest : date}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="sticky top-[66px] z-10 space-y-3 rounded-lg border border-line bg-white/94 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="h-11 w-full rounded-md border border-line bg-white pl-10 pr-3 text-sm outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/10"
              />
            </label>
            <div className="text-sm font-semibold text-muted">
              {filteredItems.length} / {rawItems.length} {t.signalCount}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterButton active={selectedCategory === "all"} onClick={() => setSelectedCategory("all")}>
              {t.allCategories}
            </FilterButton>
            {categories.map((category) => {
              return (
                <FilterButton
                  key={category.id}
                  active={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CategoryIcon category={category.id} size={15} />
                  {categoryLabel(category.id, language)}
                </FilterButton>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">{t.latestSignals}</h2>
            <div className="text-sm font-semibold text-muted">{selectedDate}</div>
          </div>

          {filteredItems.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
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
            <div className="rounded-lg border border-dashed border-line bg-white p-10 text-center">
              <h3 className="text-lg font-bold text-ink">{t.noResults}</h3>
              <p className="mt-2 text-sm text-muted">{t.noResultsBody}</p>
            </div>
          )}
        </section>
      </main>
    </Shell>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-panel px-2 py-3 sm:px-4">
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="mt-1 break-words text-[10px] font-bold uppercase tracking-normal text-muted sm:text-xs sm:tracking-[0.12em]">
        {label}
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-bold transition",
        active ? "border-signal bg-signal text-white" : "border-line bg-white text-muted hover:border-signal hover:text-ink"
      ].join(" ")}
    >
      {children}
    </button>
  );
}
