import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SaveButton } from "./save-button";
import { TagList } from "./tag-list";
import { CategoryIcon, categoryLabel } from "@/lib/categories";
import { withBasePath } from "@/lib/base-path";
import { formatDateOnly } from "@/lib/format";
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
    sourcePublished: string;
  };
};

export function SignalCard({ item, language, labels }: Props) {
  const imageUrl = withBasePath(item.imageUrl);
  const imageLabel = item.imageSource === "source" ? labels.sourceImage : item.imageSource === "generated" ? labels.generatedImage : null;

  return (
    <Link
      href={`/updates/${item.id}`}
      className="group grid h-full min-h-[390px] grid-rows-[112px_1fr] overflow-hidden border border-cream/25 bg-moss shadow-sm transition hover:-translate-y-0.5 hover:border-signal/70 hover:shadow-glow sm:min-h-[470px] sm:grid-rows-[192px_1fr]"
    >
      <div className="relative h-28 bg-line/45 sm:h-48">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <CategoryIcon category={item.category} size={36} />
          </div>
        )}
        <div className="absolute left-2 top-2 inline-flex max-w-[calc(100%-16px)] items-center gap-1 rounded-sm border border-signal/45 bg-obsidian/88 px-1.5 py-1 text-[10px] font-black text-signal shadow-sm backdrop-blur sm:left-3 sm:top-3 sm:gap-1.5 sm:px-2.5 sm:text-xs">
          <CategoryIcon category={item.category} size={14} />
          <span className="truncate">{categoryLabel(item.category, language)}</span>
        </div>
        {imageLabel ? (
          <div className="absolute bottom-3 left-3 hidden rounded-sm bg-data/95 px-2.5 py-1 text-xs font-black text-obsidian sm:block">
            {imageLabel}
          </div>
        ) : null}
      </div>

      <div className="relative grid min-h-0 grid-rows-[48px_62px_66px_1fr] gap-2 p-2.5 sm:grid-rows-[38px_70px_78px_1fr] sm:gap-3 sm:p-4">
        <div className="flex min-w-0 items-start pr-9 sm:pr-12">
          <div className="line-clamp-3 min-w-0 break-words text-[9px] font-black uppercase leading-3 text-source [overflow-wrap:anywhere] sm:text-[11px] sm:leading-4">
            <span className="text-data">{item.sourceName}</span>
            <span className="mx-1.5">/</span>
            <span>
              {labels.sourcePublished}: {formatDateOnly(item.publishedAt, language)}
            </span>
          </div>
        </div>
        <div className="absolute right-2.5 top-2.5 sm:right-4 sm:top-4">
          <SaveButton itemId={item.id} compact labels={labels} />
        </div>

        <h2 className="line-clamp-3 self-start text-sm font-black leading-tight text-ivory transition group-hover:text-signal sm:text-lg">
          {item.title}
        </h2>
        <p className="line-clamp-3 self-start text-[11px] font-semibold leading-4 text-muted sm:text-sm sm:leading-6">{item.summary}</p>

        <div className="flex min-h-0 flex-col justify-end gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <TagList tags={item.tags.slice(0, 4)} />
          </div>
          <div className="inline-flex min-w-0 items-center gap-1 text-[11px] font-black text-source sm:gap-1.5 sm:text-sm">
            <span className="truncate">{item.sourceName}</span>
            <ExternalLink className="shrink-0" size={14} />
          </div>
        </div>
      </div>
    </Link>
  );
}
