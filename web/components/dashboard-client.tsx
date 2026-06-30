"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, RadioTower, Search, TrendingUp } from "lucide-react";
import { LanguageToggle } from "./language-toggle";
import { Shell } from "./shell";
import { SignalCard } from "./signal-card";
import { CategoryIcon, categories, categoryLabel } from "@/lib/categories";
import { copy } from "@/lib/i18n";
import { dedupeSignals } from "@/lib/dedupe";
import { formatDateKey, toDisplayItem } from "@/lib/format";
import { filterItems } from "@/lib/search";
import type { DisplayItem, FeedArchive, FeedItem, Language, NewsCategory } from "@/lib/types";
import { useLanguage } from "./use-preferences";

type Props = {
  archive: FeedArchive;
};

type CategoryStat = {
  id: NewsCategory;
  count: number;
  weight: number;
};

type ArchiveEntry = {
  date: string;
  item: FeedItem;
};

export function DashboardClient({ archive }: Props) {
  const { language, setLanguage } = useLanguage();
  const t = copy[language];
  const [selectedDate, setSelectedDate] = useState(archive.dates[0] ?? "");
  const [archiveDateFilter, setArchiveDateFilter] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | "all">("all");
  const [selectedRadarCategory, setSelectedRadarCategory] = useState<NewsCategory | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [query, setQuery] = useState("");

  const rawItems = useMemo(() => archive.feedsByDate[selectedDate] ?? [], [archive.feedsByDate, selectedDate]);
  const displayItems = useMemo(() => rawItems.map((item) => toDisplayItem(item, language)), [rawItems, language]);
  const archiveEntries = useMemo<ArchiveEntry[]>(() => {
    if (archiveDateFilter) {
      return dedupeSignals(archive.feedsByDate[archiveDateFilter] ?? []).map((item) => ({
        date: archiveDateFilter,
        item
      }));
    }

    const entries = archive.dates.flatMap((date) => (archive.feedsByDate[date] ?? []).map((item) => ({ date, item })));
    const latestFirstEntries = [...entries].sort(
      (a, b) =>
        Date.parse(`${b.date}T00:00:00.000Z`) - Date.parse(`${a.date}T00:00:00.000Z`) ||
        Date.parse(b.item.published_at) - Date.parse(a.item.published_at)
    );
    const dedupedItems = dedupeSignals(latestFirstEntries.map((entry) => entry.item));
    const firstEntryById = new Map<string, ArchiveEntry>();
    for (const entry of latestFirstEntries) {
      if (!firstEntryById.has(entry.item.id)) firstEntryById.set(entry.item.id, entry);
    }

    return dedupedItems.map((item) => firstEntryById.get(item.id) ?? { date: item.published_at.slice(0, 10), item });
  }, [archive.dates, archive.feedsByDate, archiveDateFilter]);
  const archiveSections = useMemo(
    () =>
      (archiveDateFilter ? [archiveDateFilter] : archive.dates)
        .map((date) => {
          const items = archiveEntries
            .filter((entry) => entry.date === date)
            .map((entry) => toDisplayItem(entry.item, language));
          return {
            date,
            items,
            filteredItems: filterItems(items, query, selectedCategory)
          };
        })
        .filter((section) => section.filteredItems.length > 0),
    [archive.dates, archiveDateFilter, archiveEntries, language, query, selectedCategory]
  );
  const archiveItemCount = archiveEntries.length;
  const filteredArchiveItemCount = useMemo(
    () => archiveSections.reduce((total, section) => total + section.filteredItems.length, 0),
    [archiveSections]
  );
  const totalCollectedSignals = useMemo(
    () => dedupeSignals(Object.values(archive.feedsByDate).flat()).length,
    [archive.feedsByDate]
  );
  const totalCollectedSources = useMemo(
    () => new Set(Object.values(archive.feedsByDate).flatMap((items) => items.map((item) => item.source_name))).size,
    [archive.feedsByDate]
  );
  const topCategories = useMemo(() => getTopCategories(rawItems), [rawItems]);
  const activeRadarCategory =
    selectedRadarCategory && topCategories.some((category) => category.id === selectedRadarCategory)
      ? selectedRadarCategory
      : null;

  const sourceCount = new Set(rawItems.map((item) => item.source_name)).size;
  const radarSummary = useMemo(
    () => buildCategorySummary(displayItems, activeRadarCategory, rawItems.length, language),
    [displayItems, activeRadarCategory, rawItems.length, language]
  );
  const trendSummary = useMemo(
    () => buildTrendSummary(displayItems, topCategories, sourceCount, language, t.heroSubtitle),
    [displayItems, topCategories, sourceCount, language, t.heroSubtitle]
  );
  const forecastSummary = useMemo(
    () => buildForecastSummary(displayItems, topCategories, language, t.latestSignals),
    [displayItems, topCategories, language, t.latestSignals]
  );
  const handleSelectRadarCategory = (category: NewsCategory) => {
    setSelectedRadarCategory((currentCategory) => (currentCategory === category ? null : category));
  };
  const handleSelectAllArchive = () => {
    setSelectedCategory("all");
    setArchiveDateFilter(null);
    setSelectedDate(archive.dates[0] ?? selectedDate);
  };
  const handleSelectArchiveDate = (date: string) => {
    setSelectedDate(date);
    setArchiveDateFilter(date);
    setArchiveOpen(false);
  };

  useEffect(() => {
    const closeRadarSummary = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("[data-radar-interaction='true']")) {
        setSelectedRadarCategory(null);
      }
      if (!event.target.closest("[data-archive-popover='true']")) {
        setArchiveOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedRadarCategory(null);
        setArchiveOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeRadarSummary);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeRadarSummary);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <Shell language={language} rightSlot={<LanguageToggle language={language} setLanguage={setLanguage} />}>
      <main className="mx-auto flex min-w-0 w-full max-w-[1500px] flex-col gap-5 overflow-hidden px-3 py-5 sm:px-6 lg:px-8">
        <section className="radar-panel-motion overflow-hidden border border-cream/25 bg-obsidian shadow-soft">
          <div className="relative grid min-w-0 gap-5 p-4 sm:p-8 xl:grid-cols-[0.78fr_2.05fr_0.62fr]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(34,245,255,0.18),transparent_25rem),radial-gradient(circle_at_76%_24%,rgba(255,56,209,0.16),transparent_19rem),linear-gradient(135deg,rgba(234,251,255,0.035)_0%,rgba(17,24,48,0.82)_48%,rgba(7,10,22,0.98)_100%)]" />
            <div className="radar-panel-motion__grid" />
            <div className="radar-panel-motion__scan" />

            <div className="relative flex min-h-[620px] min-w-0 flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-black uppercase text-source">
                  <span>
                    [ {language === "zh" ? "当日雷达" : "Today's radar"} : {topCategories.length}{" "}
                    {language === "zh" ? "类" : "types"} ]
                  </span>
                  <span>
                    [ {language === "zh" ? "当日信号" : "Today's signals"} : {rawItems.length} ]
                  </span>
                  <span>
                    [ {language === "zh" ? "简报日期" : "briefing date"} : {selectedDate} ]
                  </span>
                </div>
                <div className="mt-14 max-w-xl">
                  <h1
                    className="text-5xl font-black uppercase leading-[0.9] tracking-normal text-ivory drop-shadow-[0_0_22px_rgba(34,245,255,0.22)] sm:text-6xl"
                    aria-label={language === "zh" ? "AI 信号雷达" : "AI Signal Radar"}
                  >
                    {language === "zh" ? (
                      <>
                        <span className="block whitespace-nowrap">AI 信号</span>
                        <span className="block">雷达</span>
                      </>
                    ) : (
                      <>
                        <span className="block whitespace-nowrap">AI Signal</span>
                        <span className="block">Radar</span>
                      </>
                    )}
                  </h1>
                  <p className="mt-5 max-w-[330px] break-words text-base font-semibold leading-7 text-muted sm:max-w-xl">
                    {t.radarCaption}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-2 text-center sm:grid-cols-3 xl:grid-cols-1">
                <Metric value={String(totalCollectedSignals)} label={language === "zh" ? "累计信号" : "Total signals"} />
                <Metric value={String(totalCollectedSources)} label={language === "zh" ? "累计来源" : "Total sources"} />
              </div>
            </div>

            <div
              className="relative flex min-h-[620px] min-w-0 flex-col items-center justify-center px-0"
              data-radar-interaction="true"
            >
              <div className="radar-panel-motion__pulse radar-panel-motion__pulse--radar" />
              <SignalRadar
                categories={topCategories}
                language={language}
                selectedCategory={activeRadarCategory}
                summary={radarSummary}
                total={rawItems.length}
                onSelectCategory={handleSelectRadarCategory}
                showStats={false}
              />
            </div>

            <div className="relative flex min-h-[620px] min-w-0 flex-col justify-between border-t border-white/18 pt-5 xl:border-t-0 xl:pt-0">
              <div>
                <div className="flex items-center gap-2 text-sm font-black uppercase text-category">
                  <RadioTower size={16} />
                  {language === "zh" ? "雷达读数" : "Radar readout"}
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                  {language === "zh"
                    ? "点击雷达上的标签、节点或下方类别，摘要会从雷达点直接展开。"
                    : "Click a radar label, node, or category row. The summary expands directly from the radar point."}
                </p>
              </div>

              <div className="mt-6 space-y-3" data-radar-interaction="true">
                {topCategories.slice(0, 5).map((category, index) => {
                  const percent = rawItems.length > 0 ? Math.round((category.count / rawItems.length) * 100) : 0;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleSelectRadarCategory(category.id)}
                      className={[
                        "w-full border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-signal/70",
                        activeRadarCategory === category.id
                          ? "border-signal bg-signal/12 shadow-glow"
                          : "border-white/18 bg-white/8 hover:border-category/60 hover:bg-white/12"
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="inline-flex min-w-0 items-center gap-2 font-black text-ink">
                          <span className="text-source">{String(index + 1).padStart(2, "0")}</span>
                          <CategoryIcon category={category.id} size={15} />
                          <span className="truncate text-category">{categoryLabel(category.id, language)}</span>
                        </span>
                        <span className="font-black text-data">{category.count}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-3">
                        <div className="h-1.5 overflow-hidden bg-white/12">
                          <div className="h-full bg-signal" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="text-xs font-black text-source">{percent}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="grid items-stretch gap-5 lg:grid-cols-2">
          <SummaryColumn icon={<Activity size={16} />} title={t.whatChanged} body={trendSummary.body} points={trendSummary.points} />
          <SummaryColumn icon={<TrendingUp size={16} />} title={t.watchTomorrow} body={forecastSummary.body} points={forecastSummary.points} />
        </section>

        <section className="relative z-40 border border-cream/25 bg-graphite/95 p-4 text-ink shadow-soft backdrop-blur-xl">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="h-10 w-full rounded-sm border border-white/20 bg-white/10 pl-9 pr-3 text-sm font-semibold text-ink outline-none transition placeholder:text-muted focus:border-signal focus:ring-4 focus:ring-signal/10"
              />
            </label>
            <div className="shrink-0 rounded-sm border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase text-data">
              {filteredArchiveItemCount} / {archiveItemCount} {t.signalCount}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              <FilterButton active={selectedCategory === "all" && !archiveDateFilter} onClick={handleSelectAllArchive}>
                {t.allCategories}
              </FilterButton>
              {categories.map((category) => (
                <FilterButton
                  key={category.id}
                  active={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CategoryIcon category={category.id} size={14} />
                  {categoryLabel(category.id, language)}
                </FilterButton>
              ))}
            </div>

            <ArchivePopover
              dates={archive.dates}
              selectedDate={selectedDate}
              isOpen={archiveOpen}
              onToggle={() => setArchiveOpen((current) => !current)}
              onSelectDate={handleSelectArchiveDate}
              language={language}
              latestLabel={t.latest}
            />
          </div>
        </section>

        <section className="relative z-0 min-h-[760px] border-t border-white/16 pt-5">
          <div className="mb-5 flex items-end justify-between">
              <h2 className="text-3xl font-black uppercase leading-none text-ivory drop-shadow-[0_0_18px_rgba(34,245,255,0.22)]">
                {language === "zh" ? "信号归档" : "Signal Archive"}
              </h2>
            <div className="text-xs font-black uppercase text-source">
              [ {filteredArchiveItemCount} / {archiveItemCount} {t.signalCount} ]
            </div>
          </div>

          {archiveSections.length > 0 ? (
            <div className="space-y-10">
              {archiveSections.map((section) => (
                <section key={section.date}>
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-white/16 pb-3">
                    <div>
                      <div className="text-xs font-black uppercase text-source">
                        [ {t.briefingDate} : {section.date} ]
                      </div>
                      <h3 className="mt-1 text-2xl font-black uppercase text-signal">
                        {formatDateKey(section.date, language)}
                      </h3>
                    </div>
                    <div className="rounded-sm border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase text-data">
                      {section.filteredItems.length} / {section.items.length} {t.signalCount}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {section.filteredItems.map((item) => (
                      <SignalCard
                        key={`${section.date}-${item.id}`}
                        item={item}
                        language={language}
                        labels={{
                          save: t.save,
                          saved: t.saved,
                          remove: t.remove,
                          sourceImage: t.sourceImage,
                          generatedImage: t.generatedImage,
                          sourcePublished: t.sourcePublished
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-white/25 bg-white/10 p-10 text-center">
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
    <div className="min-w-0 border border-white/20 bg-white/10 px-2 py-3 shadow-[inset_0_0_28px_rgba(34,245,255,0.04)] sm:px-4">
      <div className="text-2xl font-black text-data">{value}</div>
      <div className="mt-1 truncate text-[10px] font-black uppercase tracking-normal text-source sm:text-xs">
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
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-sm px-3 text-xs font-black transition sm:text-sm",
        active
          ? "bg-signal text-obsidian ring-1 ring-inset ring-signal shadow-glow"
          : "bg-category/12 text-muted ring-1 ring-inset ring-category/45 hover:text-ink hover:ring-signal/55"
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SummaryColumn({
  icon,
  title,
  body,
  points
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  points: string[];
}) {
  return (
    <div className="flex min-h-[360px] min-w-0 flex-col overflow-hidden border border-cream/25 bg-graphite/88 p-5 shadow-soft sm:p-6">
      <div className="flex items-center gap-2 text-xs font-black uppercase text-signal">
        {icon}
        {title}
      </div>
      <p className="mt-4 max-w-[300px] break-words text-sm font-semibold leading-6 text-cream [overflow-wrap:anywhere] sm:max-w-none">
        {body}
      </p>
      <ul className="mt-4 min-w-0 max-w-[300px] flex-1 space-y-3 border-t border-white/16 pt-4 sm:max-w-none">
        {points.map((point) => (
          <li key={point} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2 text-sm leading-6 text-ink">
            <span className="mt-2 h-1.5 w-1.5 bg-source" />
            <span className="min-w-0 break-all">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArchivePopover({
  dates,
  selectedDate,
  isOpen,
  onToggle,
  onSelectDate,
  language,
  latestLabel
}: {
  dates: string[];
  selectedDate: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelectDate: (date: string) => void;
  language: "zh" | "en";
  latestLabel: string;
}) {
  const availableDates = useMemo(() => new Set(dates), [dates]);
  const parsedArchiveDates = useMemo(
    () => dates.map((date) => parseDateKey(date)).filter((date): date is Date => date !== null),
    [dates]
  );
  const archiveYears = useMemo(
    () => [...new Set(parsedArchiveDates.map((date) => date.getUTCFullYear()))].sort((a, b) => b - a),
    [parsedArchiveDates]
  );
  const selected = parseDateKey(selectedDate) ?? parseDateKey(dates[0]);
  const latestDate = dates[0];
  const selectedMonthKey = formatMonthKey(selected ?? parsedArchiveDates[0] ?? new Date());
  const [visibleMonthKey, setVisibleMonthKey] = useState(selectedMonthKey);
  const [visibleYear, visibleMonth] = visibleMonthKey.split("-").map(Number);
  const year = visibleYear || selected?.getUTCFullYear() || new Date().getUTCFullYear();
  const month = visibleMonth ? visibleMonth - 1 : selected?.getUTCMonth() ?? new Date().getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const startOffset = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const yearOptions = archiveYears.length > 0 ? archiveYears : [year];
  const monthOptions = Array.from({ length: 12 }, (_, index) => index);
  const weekdays =
    language === "zh" ? ["一", "二", "三", "四", "五", "六", "日"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const selectedLabel = selectedDate === latestDate ? latestLabel : selectedDate;
  const cells = [
    ...Array.from({ length: startOffset }, (_, index) => ({ key: `blank-${index}`, day: 0, dateKey: "" })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return {
        key: String(day),
        day,
        dateKey: makeDateKey(year, month, day)
      };
    })
  ];

  return (
    <div className="relative ml-auto shrink-0" data-archive-popover="true">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="inline-flex h-9 items-center gap-2 rounded-sm border border-source/45 bg-source/12 px-3 text-xs font-black uppercase text-source transition hover:border-signal hover:bg-signal/12 hover:text-signal"
      >
        <CalendarDays size={14} />
        {selectedLabel}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-[100] mt-2 w-[310px] max-w-[calc(100vw-2rem)] border border-signal/45 bg-obsidian p-3 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <div className="grid min-w-0 flex-1 grid-cols-[1fr_86px] gap-2">
              <label className="sr-only" htmlFor="archive-month">
                {language === "zh" ? "选择月份" : "Select month"}
              </label>
              <select
                id="archive-month"
                value={month}
                onChange={(event) => setVisibleMonthKey(formatMonthKeyParts(year, Number(event.target.value)))}
                className="h-8 min-w-0 rounded-sm border border-white/20 bg-white/10 px-2 text-xs font-black text-ink outline-none focus:border-signal"
              >
                {monthOptions.map((monthOption) => (
                  <option key={monthOption} value={monthOption} className="bg-obsidian text-ink">
                    {language === "zh"
                      ? `${monthOption + 1}月`
                      : new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(
                          new Date(Date.UTC(2026, monthOption, 1))
                        )}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="archive-year">
                {language === "zh" ? "选择年份" : "Select year"}
              </label>
              <select
                id="archive-year"
                value={year}
                onChange={(event) => setVisibleMonthKey(formatMonthKeyParts(Number(event.target.value), month))}
                className="h-8 rounded-sm border border-white/20 bg-white/10 px-2 text-xs font-black text-ink outline-none focus:border-signal"
              >
                {yearOptions.map((yearOption) => (
                  <option key={yearOption} value={yearOption} className="bg-obsidian text-ink">
                    {yearOption}
                  </option>
                ))}
              </select>
            </div>
            {latestDate ? (
              <button
                type="button"
                onClick={() => {
                  const latest = parseDateKey(latestDate);
                  if (latest) setVisibleMonthKey(formatMonthKey(latest));
                  onSelectDate(latestDate);
                }}
                className="rounded-sm border border-source/45 bg-source/12 px-2.5 py-1 text-xs font-black text-source transition hover:bg-source hover:text-obsidian"
              >
                {latestLabel}
              </button>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-normal text-muted">
            {weekdays.map((weekday) => (
              <div key={weekday} className="py-1">
                {weekday}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              if (!cell.dateKey) return <div key={cell.key} className="aspect-square" />;

              const isAvailable = availableDates.has(cell.dateKey);
              const isSelected = selectedDate === cell.dateKey;
              const isLatest = latestDate === cell.dateKey;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => {
                    if (isAvailable) {
                      setVisibleMonthKey(formatMonthKeyParts(year, month));
                      onSelectDate(cell.dateKey);
                    }
                  }}
                  disabled={!isAvailable}
                  className={[
                    "relative aspect-square rounded-sm text-xs font-black transition",
                    isSelected
                      ? "bg-signal text-obsidian shadow-glow"
                      : isAvailable
                        ? "bg-white/10 text-ink ring-1 ring-inset ring-white/18 hover:bg-white/18 hover:text-signal hover:ring-signal/40"
                        : "text-muted/30"
                  ].join(" ")}
                  aria-label={cell.dateKey}
                >
                  {cell.day}
                  {isLatest ? (
                    <span
                      className={[
                        "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                        isSelected ? "bg-obsidian" : "bg-signal"
                      ].join(" ")}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SignalRadar({
  categories: categoryStats,
  language,
  selectedCategory,
  summary,
  total,
  onSelectCategory,
  showStats = true
}: {
  categories: CategoryStat[];
  language: "zh" | "en";
  selectedCategory: NewsCategory | null;
  summary: ReturnType<typeof buildCategorySummary>;
  total: number;
  onSelectCategory?: (category: NewsCategory) => void;
  showStats?: boolean;
}) {
  const center = 160;
  const maxRadius = 112;
  const ringRadii = [28, 56, 84, 112];
  const statsByCategory = new Map(categoryStats.map((category) => [category.id, category]));
  const radarPoints = categories.map((category, index) => {
    const stat = statsByCategory.get(category.id);
    const angle = (index / categories.length) * Math.PI * 2 - Math.PI / 2;
    const weight = stat?.weight ?? 0;
    const radius = 20 + weight * (maxRadius - 20);
    return {
      id: category.id,
      count: stat?.count ?? 0,
      weight,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      axisX: center + Math.cos(angle) * maxRadius,
      axisY: center + Math.sin(angle) * maxRadius,
      labelX: center + Math.cos(angle) * (maxRadius + 18),
      labelY: center + Math.sin(angle) * (maxRadius + 17)
    };
  });
  const polygonPoints = radarPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const topStats = [...categoryStats].sort((a, b) => b.count - a.count).slice(0, 4);
  const selectedPoint = radarPoints.find((point) => point.id === selectedCategory);
  const selectedPanelTransform = selectedPoint ? getRadarSummaryPanelTransform(selectedPoint, center) : "";

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
      <div className="relative mx-auto flex h-[360px] w-[360px] max-w-full items-center justify-center overflow-visible sm:h-[460px] sm:w-[460px]">
        <svg viewBox="0 0 320 320" role="img" aria-label="Signal distribution radar" className="h-full w-full overflow-visible">
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22F5FF" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#FF38D1" stopOpacity="0.08" />
            </radialGradient>
          </defs>
          {ringRadii.map((radius) => (
            <circle key={radius} cx={center} cy={center} r={radius} fill="none" stroke="#22F5FF" strokeOpacity="0.24" />
          ))}
          {radarPoints.map((point) => (
            <line
              key={`${point.id}-axis`}
              x1={center}
              y1={center}
              x2={point.axisX}
              y2={point.axisY}
              stroke="#8B5CFF"
              strokeOpacity="0.2"
            />
          ))}
          <polygon points={polygonPoints} fill="url(#radarGlow)" stroke="#22F5FF" strokeOpacity="0.95" strokeWidth="2.25" />
          <circle cx={center} cy={center} r="22" fill="#22F5FF" fillOpacity="0.14" stroke="#EAFBFF" strokeOpacity="0.34" />
          {radarPoints.map((point) => {
            const isSelected = selectedCategory === point.id;
            const canSelect = point.count > 0 && onSelectCategory;
            return (
            <g
              key={point.id}
              role={canSelect ? "button" : undefined}
              tabIndex={canSelect ? 0 : undefined}
              aria-label={
                canSelect
                  ? `${categoryLabel(point.id, language)} ${point.count} ${language === "zh" ? "条信号" : "signals"}`
                  : undefined
              }
              className={canSelect ? "cursor-pointer outline-none" : undefined}
              onClick={canSelect ? () => onSelectCategory?.(point.id) : undefined}
              onKeyDown={
                canSelect
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectCategory?.(point.id);
                      }
                    }
                  : undefined
              }
            >
              {isSelected ? (
                <circle cx={point.x} cy={point.y} r="17" fill="none" stroke="#FF38D1" strokeOpacity="0.9" strokeWidth="2" />
              ) : null}
              <circle
                cx={point.x}
                cy={point.y}
                r={point.count > 0 ? 9 : 5}
                fill={point.count > 0 ? "#EAFBFF" : "#273855"}
                stroke="#22F5FF"
                strokeOpacity={point.count > 0 ? "0.95" : "0.25"}
              />
              <rect
                x={point.labelX < center - 8 ? point.labelX - 70 : point.labelX > center + 8 ? point.labelX - 2 : point.labelX - 40}
                y={point.labelY - 13}
                width="80"
                height="26"
                fill="transparent"
              />
              <text
                x={point.labelX}
                y={point.labelY}
                textAnchor={point.labelX < center - 8 ? "end" : point.labelX > center + 8 ? "start" : "middle"}
                dominantBaseline="middle"
                fill={isSelected ? "#FF38D1" : point.count > 0 ? "#EAFBFF" : "#637B93"}
                fontSize="14"
                fontWeight={isSelected ? "900" : "700"}
              >
                {shortCategoryLabel(point.id, language)}
              </text>
            </g>
            );
          })}
        </svg>
        {summary && selectedPoint ? (
          <div
            className="absolute z-20 max-h-[330px] w-[min(300px,calc(100vw-48px))] overflow-y-auto border border-signal/60 bg-obsidian/95 p-3 text-left shadow-soft backdrop-blur-xl [scrollbar-width:thin] [scrollbar-color:rgba(34,245,255,0.65)_rgba(255,255,255,0.12)]"
            style={{
              left: `${(selectedPoint.x / 320) * 100}%`,
              top: `${(selectedPoint.y / 320) * 100}%`,
              transform: selectedPanelTransform
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex min-w-0 items-center gap-2 text-sm font-black text-ink">
                <CategoryIcon category={summary.category} size={15} />
                <span className="truncate">{summary.title}</span>
              </div>
              <span className="shrink-0 text-[11px] font-black text-signal">
                {summary.count} / {total}
              </span>
            </div>
            <p className="mt-2 break-words text-xs font-semibold leading-5 text-muted">{summary.body}</p>
            <div className="mt-3 border-t border-white/18 pt-2">
              <div className="text-[10px] font-black uppercase text-muted">
                {language === "zh" ? "代表信号" : "Representative signals"}
              </div>
              <ul className="mt-1.5 space-y-1.5">
                {summary.items.slice(0, 2).map((item) => (
                  <li key={item.id} className="break-words text-[11px] font-semibold leading-4 text-ink">
                    <span className="text-signal">{item.sourceName}</span>
                    <span className="text-muted"> / </span>
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      {showStats ? <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {topStats.map((category) => {
          const percent = total > 0 ? Math.round((category.count / total) * 100) : 0;
          return (
            <div key={category.id} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
              <div className="min-w-0">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="inline-flex min-w-0 items-center gap-1.5 font-bold text-ink">
                    <CategoryIcon category={category.id} size={13} />
                    <span className="truncate">{categoryLabel(category.id, language)}</span>
                  </span>
                  <span className="font-bold text-signal">{category.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden bg-white/12">
                  <div className="h-full bg-signal" style={{ width: `${percent}%` }} />
                </div>
              </div>
              <span className="font-bold text-muted">{percent}%</span>
            </div>
          );
        })}
      </div> : null}
    </div>
  );
}

function getTopCategories(items: Array<{ category: NewsCategory }>): CategoryStat[] {
  const counts = new Map<NewsCategory, number>();
  for (const item of items) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  const max = Math.max(...counts.values(), 1);
  return categories
    .map((category) => ({
      id: category.id,
      count: counts.get(category.id) ?? 0,
      weight: (counts.get(category.id) ?? 0) / max
    }))
    .filter((category) => category.count > 0)
    .sort((a, b) => b.count - a.count);
}

function getRadarSummaryPanelTransform(point: { x: number; y: number }, center: number) {
  const horizontalOffset = 24;
  const verticalOffset = 18;

  if (point.y < center - 42) {
    return point.x < center
      ? `translate(${horizontalOffset}px, -36%)`
      : `translate(calc(-100% - ${horizontalOffset}px), -36%)`;
  }

  if (point.y > center + 42) {
    return point.x < center
      ? `translate(${horizontalOffset}px, calc(-100% + ${verticalOffset}px))`
      : `translate(calc(-100% - ${horizontalOffset}px), calc(-100% + ${verticalOffset}px))`;
  }

  return point.x < center
    ? `translate(${horizontalOffset}px, -50%)`
    : `translate(calc(-100% - ${horizontalOffset}px), -50%)`;
}

function shortCategoryLabel(category: NewsCategory, language: "zh" | "en") {
  if (language === "en") return categoryLabel(category, language);

  switch (category) {
    case "business_investment":
      return "产业";
    case "models_products":
      return "模型";
    case "research_papers":
      return "研究";
    case "coding_ai":
      return "写代码 AI";
    case "image_ai":
      return "图片 AI";
    case "video_ai":
      return "视频";
    case "tools_apps":
      return "工具";
    default:
      return categoryLabel(category, language);
  }
}

function buildCategorySummary(items: DisplayItem[], category: NewsCategory | null, total: number, language: Language) {
  if (!category) return null;

  const categoryItems = items.filter((item) => item.category === category);
  if (categoryItems.length === 0) return null;

  const percent = total > 0 ? Math.round((categoryItems.length / total) * 100) : 0;
  const sources = [...new Set(categoryItems.map((item) => item.sourceName))].slice(0, 3);
  const representativeItems = categoryItems.slice(0, 3);
  const signalText = representativeItems
    .map((item) => `${item.title}：${item.summary}`)
    .join(language === "zh" ? "；" : "; ");
  const summaryText = truncateText(signalText, language === "zh" ? 150 : 230);
  const sourceText = sources.join(language === "zh" ? "、" : ", ");

  const body =
    language === "zh"
      ? `${categoryLabel(category, language)} 当前占 ${percent}%，共 ${categoryItems.length} 条信号。主要来源包括 ${sourceText}。这一组内容的重点是：${summaryText}`
      : `${categoryLabel(category, language)} currently represents ${percent}% of today's radar with ${categoryItems.length} signals. Main sources include ${sourceText}. The segment centers on: ${summaryText}`;

  return {
    category,
    title: categoryLabel(category, language),
    count: categoryItems.length,
    body,
    items: representativeItems
  };
}

function buildTrendSummary(
  items: DisplayItem[],
  topCategories: CategoryStat[],
  sourceCount: number,
  language: Language,
  fallback: string
) {
  if (items.length === 0) {
    return { body: fallback, points: [fallback] };
  }

  const profile = analyzeFeedItems(items, topCategories, sourceCount, language);
  const body =
    language === "zh"
      ? `读完整个 feed 后，今天的主线不是单一模型发布，而是 AI 从“能力展示”转向“可治理、可验证、可部署”。${items.length} 条信号里，平台公司在强化产品生态、内容合作和监管框架；研究社区则集中处理价值观识别、合成内容溯源、代理安全、企业任务评测和垂直医疗代理。`
      : `After reading the full feed, today's pattern is not a single model launch. AI is moving from capability demos toward systems that are governable, verifiable, and deployable. Across ${items.length} signals, platforms are tightening product ecosystems, content partnerships, and governance frameworks while research focuses on values, provenance, agent safety, enterprise evaluation, and vertical agents.`;
  const points =
    language === "zh"
      ? [
          `平台与产品：${profile.platform}。Google I/O、内容合作和社区投资说明大公司正在把 AI 能力包装进更稳定的产品、内容和区域生态。`,
          `治理与可信：${profile.governance}。OpenAI 的治理/选举安全，加上价值观识别、隐写溯源和 LCO 代理约束，显示“可控 AI”正在变成产品化前提。`,
          `代理与垂直场景：${profile.agents}。OralAgent、ITBench-AA 和 Reachy Mini 指向同一件事：AI 代理必须在真实任务、本地设备和专业知识场景里证明可靠性。`,
          `基础设施与覆盖面：${profile.infrastructure}。Delta 权重同步、低资源语言 Soro 和本地机器人运行表明，下一轮竞争会围绕成本、部署位置、数据主权和区域可用性展开。`
        ]
      : [
          `Platform/product layer: ${profile.platform}. Google I/O, content partnerships, and community investment show large platforms packaging AI into more durable product and content ecosystems.`,
          `Governance/trust layer: ${profile.governance}. Governance, election safety, value detection, provenance, and constrained agents point to controllability as a prerequisite for adoption.`,
          `Agent/vertical layer: ${profile.agents}. OralAgent, ITBench-AA, and Reachy Mini all stress that agents must prove reliability in real tasks, local devices, and professional knowledge settings.`,
          `Infrastructure/access layer: ${profile.infrastructure}. Delta weight sync, low-resource Soro, and local robot execution shift the question toward cost, deployment location, data control, and regional availability.`
        ];

  return { body, points };
}

function buildForecastSummary(items: DisplayItem[], topCategories: CategoryStat[], language: Language, fallback: string) {
  if (items.length === 0) {
    return { body: fallback, points: [fallback] };
  }

  const categoryText = formatCategoryList(topCategories.slice(0, 2), language);
  const profile = analyzeFeedItems(items, topCategories, new Set(items.map((item) => item.sourceName)).size, language);
  const body =
    language === "zh"
      ? `未来 24-72 小时重点看 ${categoryText} 是否继续扩散。更重要的是观察这些信号能否从发布和论文转化为开发者采用、企业采购、政策响应或开源社区复现。`
      : `Over the next 24-72 hours, keep watching ${categoryText}. If these signals spread through developers, companies, or research communities, they may move from news events into adoption trends.`;
  const points =
    language === "zh"
      ? [
          `产品线：继续看 Google I/O 相关模型/产品信号是否带来真实开发者迁移，而不是只停留在发布会热度。`,
          `治理线：关注 OpenAI 治理、选举保障和内容合作是否成为其他平台的合规模板。`,
          `研究线：跟踪 ${profile.governance} 相关论文是否被评测、复现或整合到代理框架。`,
          `部署线：观察 ${profile.infrastructure} 是否推动本地运行、低成本训练同步和低资源语言模型的采用。`
        ]
      : [
          `Product line: watch whether Google I/O related model and product signals produce developer migration rather than launch-event attention only.`,
          `Governance line: watch whether OpenAI governance, election safeguards, and content partnerships become a compliance template for other platforms.`,
          `Research line: track whether ${profile.governance} papers are evaluated, replicated, or folded into agent frameworks.`,
          `Deployment line: watch whether ${profile.infrastructure} accelerates local execution, lower-cost training sync, and low-resource language models.`
        ];

  return { body, points };
}

function analyzeFeedItems(items: DisplayItem[], topCategories: CategoryStat[], sourceCount: number, language: Language) {
  const text = items.map((item) => `${item.title} ${item.summary} ${item.whyItMatters} ${item.sourceName}`).join(" ");
  const sourceNames = [...new Set(items.map((item) => item.sourceName))].slice(0, 4).join(" / ");
  const categoriesText = formatCategoryList(topCategories.slice(0, 3), language);
  const has = (patterns: RegExp[]) => patterns.some((pattern) => pattern.test(text));

  const governanceSignals = [
    has([/治理|governance|选举|election/i]) ? (language === "zh" ? "平台治理与选举安全" : "platform governance and election safety") : "",
    has([/价值观|values?/i]) ? (language === "zh" ? "价值观识别" : "value detection") : "",
    has([/溯源|隐写|provenance|lineage|stegan/i]) ? (language === "zh" ? "合成内容溯源" : "synthetic-content provenance") : "",
    has([/安全|约束|constraint|safety|ICRH/i]) ? (language === "zh" ? "代理安全约束" : "agent safety constraints") : ""
  ].filter(Boolean);

  const agentSignals = [
    has([/OralAgent|牙科|dental/i]) ? (language === "zh" ? "医疗垂直代理" : "vertical medical agents") : "",
    has([/ITBench|企业IT|enterprise IT/i]) ? (language === "zh" ? "企业 IT 代理评测" : "enterprise IT agent evaluation") : "",
    has([/Reachy|机器人|robot/i]) ? (language === "zh" ? "本地机器人代理" : "local robot agents") : ""
  ].filter(Boolean);

  const infrastructureSignals = [
    has([/Delta|权重同步|TRL|sync/i]) ? (language === "zh" ? "大模型权重同步" : "large-model weight sync") : "",
    has([/Soro|塔吉克|低资源|low-resource|Tajik/i]) ? (language === "zh" ? "低资源语言模型" : "low-resource language models") : "",
    has([/本地|local|INT4|FP8|量化/i]) ? (language === "zh" ? "本地化与量化部署" : "local and quantized deployment") : ""
  ].filter(Boolean);

  return {
    platform:
      language === "zh"
        ? `${sourceNames || `${sourceCount} 个来源`} 覆盖 ${categoriesText}，平台信号集中在 Google I/O、OpenAI 合作与治理动作`
        : `${sourceNames || `${sourceCount} sources`} cover ${categoriesText}, with platform signals centered on Google I/O plus OpenAI partnership and governance moves`,
    governance: joinSignals(governanceSignals, language),
    agents: joinSignals(agentSignals, language),
    infrastructure: joinSignals(infrastructureSignals, language)
  };
}

function joinSignals(signals: string[], language: Language) {
  if (signals.length === 0) return language === "zh" ? "可信、安全与评测能力" : "trust, safety, and evaluation capability";
  return signals.join(language === "zh" ? "、" : ", ");
}

function formatCategoryList(categoryStats: CategoryStat[], language: Language) {
  const labels = categoryStats.map((category) => categoryLabel(category.id, language));
  if (labels.length === 0) return language === "zh" ? "核心 AI 动态" : "core AI activity";
  return labels.join(language === "zh" ? "、" : ", ");
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function parseDateKey(dateKey: string | undefined) {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function makeDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatMonthKey(date: Date) {
  return formatMonthKeyParts(date.getUTCFullYear(), date.getUTCMonth());
}

function formatMonthKeyParts(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}
