import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SaveButton } from "./save-button";
import { TagList } from "./tag-list";
import { CategoryIcon, categoryLabel } from "@/lib/categories";
import { withBasePath } from "@/lib/base-path";
import { formatDate } from "@/lib/format";
import type { DisplayItem, Language } from "@/lib/types";

type Props = {
  item: DisplayItem;
  language: Language;
  labels: {
    save: string;
    saved: string;
    remove: string;
    sourceImage: string;
    generatedImage: string;
  };
};

export function SignalCard({ item, language, labels }: Props) {
  const imageUrl = withBasePath(item.imageUrl);
  const imageLabel = item.imageSource === "source" ? labels.sourceImage : item.imageSource === "generated" ? labels.generatedImage : null;

  return (
    <Link
      href={`/updates/${item.id}`}
      className="group grid min-h-[430px] overflow-hidden rounded-lg border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-signal/45 hover:shadow-soft"
    >
      <div className="relative h-44 bg-panel">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <CategoryIcon category={item.category} size={36} />
          </div>
        )}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-2.5 py-1 text-xs font-bold text-ink shadow-sm">
          <CategoryIcon category={item.category} size={14} />
          {categoryLabel(item.category, language)}
        </div>
        {imageLabel ? (
          <div className="absolute bottom-3 left-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-bold text-white">
            {imageLabel}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-xs font-semibold text-muted">
            <span>{item.sourceName}</span>
            <span className="mx-1.5">/</span>
            <span>{formatDate(item.publishedAt, language)}</span>
          </div>
          <SaveButton itemId={item.id} compact labels={labels} />
        </div>

        <h2 className="line-clamp-3 text-lg font-bold leading-snug text-ink group-hover:text-signal">{item.title}</h2>
        <p className="line-clamp-3 text-sm leading-6 text-muted">{item.summary}</p>

        <div className="mt-auto space-y-3">
          <TagList tags={item.tags.slice(0, 4)} />
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-signal">
            <span>{item.sourceName}</span>
            <ExternalLink size={14} />
          </div>
        </div>
      </div>
    </Link>
  );
}
