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
      className="group grid h-full min-h-[470px] grid-rows-[192px_1fr] overflow-hidden border border-cream/25 bg-moss shadow-sm transition hover:-translate-y-0.5 hover:border-signal/70 hover:shadow-glow"
    >
      <div className="relative h-48 bg-line/45">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <CategoryIcon category={item.category} size={36} />
          </div>
        )}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-sm border border-signal/45 bg-obsidian/88 px-2.5 py-1 text-xs font-black text-signal shadow-sm backdrop-blur">
          <CategoryIcon category={item.category} size={14} />
          {categoryLabel(item.category, language)}
        </div>
        {imageLabel ? (
          <div className="absolute bottom-3 left-3 rounded-sm bg-data/95 px-2.5 py-1 text-xs font-black text-obsidian">
            {imageLabel}
          </div>
        ) : null}
      </div>

      <div className="relative grid min-h-0 grid-rows-[38px_70px_78px_1fr] gap-3 p-4">
        <div className="flex min-w-0 items-start pr-12">
          <div className="min-w-0 break-words text-[11px] font-black uppercase leading-4 text-source [overflow-wrap:anywhere]">
            <span className="text-data">{item.sourceName}</span>
            <span className="mx-1.5">/</span>
            <span>{formatDate(item.publishedAt, language)}</span>
          </div>
        </div>
        <div className="absolute right-4 top-4">
          <SaveButton itemId={item.id} compact labels={labels} />
        </div>

        <h2 className="line-clamp-3 self-start text-lg font-black leading-tight text-ivory transition group-hover:text-signal">
          {item.title}
        </h2>
        <p className="line-clamp-3 self-start text-sm font-semibold leading-6 text-muted">{item.summary}</p>

        <div className="flex min-h-0 flex-col justify-end gap-3">
          <TagList tags={item.tags.slice(0, 4)} />
          <div className="inline-flex items-center gap-1.5 text-sm font-black text-source">
            <span>{item.sourceName}</span>
            <ExternalLink size={14} />
          </div>
        </div>
      </div>
    </Link>
  );
}
