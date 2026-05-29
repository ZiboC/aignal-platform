"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { LanguageToggle } from "./language-toggle";
import { SaveButton } from "./save-button";
import { Shell } from "./shell";
import { TagList } from "./tag-list";
import { CategoryIcon, categoryLabel } from "@/lib/categories";
import { withBasePath } from "@/lib/base-path";
import { copy } from "@/lib/i18n";
import { formatConfidence, formatDateTime, toDisplayItem } from "@/lib/format";
import type { FeedItem } from "@/lib/types";
import { useLanguage } from "./use-preferences";

type Props = {
  item: FeedItem;
};

export function DetailClient({ item: rawItem }: Props) {
  const { language, setLanguage } = useLanguage();
  const t = copy[language];
  const item = toDisplayItem(rawItem, language);
  const imageUrl = withBasePath(item.imageUrl);
  const confidence = formatConfidence(item.confidence);

  return (
    <Shell language={language} rightSlot={<LanguageToggle language={language} setLanguage={setLanguage} />}>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-muted shadow-sm"
        >
          <ArrowLeft size={16} />
          {t.backHome}
        </Link>

        <article className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full min-h-[320px] w-full object-cover" />
            ) : (
              <div className="flex min-h-[320px] items-center justify-center bg-panel text-muted">
                <CategoryIcon category={item.category} size={42} />
              </div>
            )}
          </div>

          <section className="flex flex-col gap-5 rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-signal/10 px-3 py-1 font-semibold text-signal">
                <CategoryIcon category={item.category} size={15} />
                {categoryLabel(item.category, language)}
              </span>
              <span className="text-muted">{formatDateTime(item.publishedAt, language)}</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink sm:text-4xl">{item.title}</h1>
              <p className="text-base leading-7 text-muted">{item.summary}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <SaveButton itemId={item.id} labels={{ save: t.save, saved: t.saved, remove: t.remove }} />
              {item.readingUrl ? (
                <a
                  href={item.readingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white"
                >
                  {t.openSource}
                  <ExternalLink size={16} />
                </a>
              ) : null}
            </div>
          </section>
        </article>

        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-muted">{t.why}</h2>
            <p className="mt-3 text-base leading-7 text-ink">{item.whyItMatters}</p>
          </div>

          <aside className="space-y-4 rounded-lg border border-line bg-white p-5 shadow-soft">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.12em] text-muted">{t.source}</div>
              <div className="mt-2 text-sm font-semibold text-ink">{item.sourceName}</div>
            </div>
            {confidence ? (
              <div>
                <div className="text-sm font-bold uppercase tracking-[0.12em] text-muted">{t.confidence}</div>
                <div className="mt-2 text-sm font-semibold text-ink">{confidence}</div>
              </div>
            ) : null}
            <TagList tags={item.tags} />
          </aside>
        </section>
      </main>
    </Shell>
  );
}
