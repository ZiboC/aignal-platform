"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, ExternalLink, ImageIcon, LinkIcon, Radar, Target, Users } from "lucide-react";
import { LanguageToggle } from "./language-toggle";
import { SaveButton } from "./save-button";
import { Shell } from "./shell";
import { TagList } from "./tag-list";
import { CategoryIcon, categoryLabel } from "@/lib/categories";
import { withBasePath } from "@/lib/base-path";
import { copy } from "@/lib/i18n";
import { formatConfidence, formatDate, formatDateTime, toDisplayItem } from "@/lib/format";
import type { DisplayItem, FeedItem, Language } from "@/lib/types";
import { useLanguage } from "./use-preferences";

type Props = {
  item: FeedItem;
  relatedItems?: FeedItem[];
};

export function DetailClient({ item: rawItem, relatedItems = [] }: Props) {
  const { language, setLanguage } = useLanguage();
  const t = copy[language];
  const item = toDisplayItem(rawItem, language);
  const related = relatedItems.map((relatedItem) => toDisplayItem(relatedItem, language));
  const imageUrl = withBasePath(item.imageUrl);
  const confidence = formatConfidence(item.confidence);
  const imageLabel =
    item.imageSource === "source" ? t.sourceImage : item.imageSource === "generated" ? t.generatedImage : language === "zh" ? "图片" : "Image";
  const brief = buildSignalBrief(item, language);

  return (
    <Shell language={language} rightSlot={<LanguageToggle language={language} setLanguage={setLanguage} />}>
      <main className="mx-auto flex w-full max-w-[1220px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-sm border border-cream/25 bg-graphite/95 px-3 py-2 text-sm font-black text-ink shadow-sm hover:border-signal/50 hover:bg-signal/10"
        >
          <ArrowLeft size={16} />
          {t.backHome}
        </Link>

        <article className="grid overflow-hidden border border-cream/25 bg-obsidian shadow-soft lg:grid-cols-[1.12fr_0.88fr]">
          <div className="relative min-h-[300px] bg-panel lg:min-h-[420px]">
            <HeroImage item={item} imageUrl={imageUrl} imageLabel={imageLabel} />
          </div>

          <section className="flex min-w-0 flex-col justify-between gap-6 border-t border-cream/25 bg-graphite/92 p-5 lg:border-l lg:border-t-0 sm:p-7">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-2 rounded-sm border border-category/35 bg-category/12 px-3 py-1 font-black text-category">
                <CategoryIcon category={item.category} size={15} />
                {categoryLabel(item.category, language)}
              </span>
              <span className="font-black text-source">{formatDateTime(item.publishedAt, language)}</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-black leading-tight tracking-normal text-signal drop-shadow-[0_0_18px_rgba(34,245,255,0.18)] sm:text-4xl">
                {item.title}
              </h1>
              <p className="text-base font-semibold leading-7 text-muted">{item.summary}</p>
            </div>

            <div className="border border-signal/30 bg-signal/8 p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-signal">
                <Radar size={15} />
                {language === "zh" ? "AI Signal Takeaway" : "AI Signal Takeaway"}
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-ink">{brief.takeaway}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <SaveButton itemId={item.id} labels={{ save: t.save, saved: t.saved, remove: t.remove }} />
              {item.readingUrl ? (
                <a
                  href={item.readingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-black text-obsidian transition hover:bg-source"
                >
                  {t.openSource}
                  <ExternalLink size={16} />
                </a>
              ) : null}
            </div>
          </section>
        </article>

        <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <BriefSection icon={<CheckCircle2 size={16} />} title={language === "zh" ? "发生了什么" : "What happened"} body={brief.whatHappened} />
            <BriefSection icon={<Target size={16} />} title={t.why} body={brief.whyItMatters} />
            <BriefSection icon={<Users size={16} />} title={language === "zh" ? "谁应该关注" : "Who should care"} body={brief.whoShouldCare} />
            <BriefSection icon={<Radar size={16} />} title={language === "zh" ? "下一步看什么" : "What to watch next"} body={brief.watchNext} />
          </div>

          <aside className="flex min-w-0 flex-col gap-4 border border-cream/25 bg-graphite/92 p-5 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-black uppercase text-source">
              <LinkIcon size={16} />
              {language === "zh" ? "Signal Metadata" : "Signal Metadata"}
            </div>
            <div className="grid gap-3 border-t border-white/16 pt-4">
              <MetaRow label={t.source} value={item.sourceName} valueClassName="text-data" />
              <MetaRow label={t.published} value={formatDateTime(item.publishedAt, language)} valueClassName="text-source" />
              <MetaRow label={language === "zh" ? "类别" : "Category"} value={categoryLabel(item.category, language)} valueClassName="text-category" />
              {confidence ? <MetaRow label={t.confidence} value={confidence} valueClassName="text-signal" /> : null}
              <MetaRow label={language === "zh" ? "图片来源" : "Image source"} value={imageLabel} valueClassName="text-ink" />
            </div>
            <div className="border-t border-white/16 pt-4">
              <div className="mb-3 text-xs font-black uppercase text-muted">{language === "zh" ? "标签" : "Tags"}</div>
              <TagList tags={item.tags} />
            </div>
          </aside>
        </section>

        {related.length > 0 ? (
          <section className="border-t border-white/16 pt-5">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-black uppercase text-ivory">{language === "zh" ? "相关信号" : "Related signals"}</h2>
              <div className="text-xs font-black uppercase text-source">[ {formatDate(item.publishedAt, language)} ]</div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((relatedItem) => (
                <RelatedSignal key={relatedItem.id} item={relatedItem} language={language} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </Shell>
  );
}

function HeroImage({ item, imageUrl, imageLabel }: { item: DisplayItem; imageUrl: string | null; imageLabel: string }) {
  return (
    <>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full min-h-[300px] w-full object-cover lg:min-h-[420px]" />
      ) : (
        <div className="flex h-full min-h-[300px] items-center justify-center bg-panel text-muted lg:min-h-[420px]">
          <CategoryIcon category={item.category} size={48} />
        </div>
      )}
      <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-sm bg-signal px-3 py-1.5 text-xs font-black text-obsidian">
        <ImageIcon size={14} />
        {imageLabel}
      </div>
    </>
  );
}

function BriefSection({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <section className="min-h-[190px] border border-cream/25 bg-graphite/90 p-5 shadow-soft">
      <div className="flex items-center gap-2 text-xs font-black uppercase text-category">
        {icon}
        {title}
      </div>
      <p className="mt-4 text-sm font-semibold leading-7 text-ink">{body}</p>
    </section>
  );
}

function MetaRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 text-sm">
      <div className="font-black uppercase text-muted">{label}</div>
      <div className={["min-w-0 break-words font-black", valueClassName ?? "text-ink"].join(" ")}>{value}</div>
    </div>
  );
}

function RelatedSignal({ item, language }: { item: DisplayItem; language: Language }) {
  const imageUrl = withBasePath(item.imageUrl);

  return (
    <Link
      href={`/updates/${item.id}`}
      className="group grid min-h-[250px] grid-rows-[110px_1fr] overflow-hidden border border-cream/25 bg-moss transition hover:-translate-y-0.5 hover:border-signal/70 hover:shadow-glow"
    >
      <div className="relative bg-line/45">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <CategoryIcon category={item.category} size={28} />
          </div>
        )}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-sm border border-signal/45 bg-obsidian/88 px-2 py-1 text-[11px] font-black text-signal">
          <CategoryIcon category={item.category} size={12} />
          {categoryLabel(item.category, language)}
        </div>
      </div>
      <div className="grid gap-2 p-4">
        <div className="text-[10px] font-black uppercase text-source">
          <span className="text-data">{item.sourceName}</span>
          <span className="mx-1.5">/</span>
          <span>{formatDate(item.publishedAt, language)}</span>
        </div>
        <h3 className="line-clamp-2 text-base font-black leading-tight text-ivory group-hover:text-signal">{item.title}</h3>
        <p className="line-clamp-2 text-xs font-semibold leading-5 text-muted">{item.summary}</p>
      </div>
    </Link>
  );
}

function buildSignalBrief(item: DisplayItem, language: Language) {
  const category = categoryLabel(item.category, language);
  const source = item.sourceName;
  const tags = item.tags.slice(0, 3).join(language === "zh" ? "、" : ", ");
  const audience = audienceForCategory(item.category, language);

  if (language === "zh") {
    return {
      takeaway: `这条 ${category} 信号说明，来自 ${source} 的信息已经不只是单点新闻，而是值得放进产品、研究和行业判断里的趋势线索。`,
      whatHappened: `${source} 发布了这条关于 ${category} 的更新：${item.summary}`,
      whyItMatters: item.whyItMatters || `它值得关注，因为这类 ${category} 信号通常会影响工具采用、模型路线或平台生态判断。`,
      whoShouldCare: `${audience} 应该重点关注这条信号，尤其是正在跟踪 ${tags || category} 的团队。`,
      watchNext: `接下来观察这条信号是否出现开发者采用、竞品回应、研究复现、企业部署或政策/平台层面的后续动作。`
    };
  }

  return {
    takeaway: `This ${category} signal from ${source} is more than a standalone update; it is useful evidence for product, research, and market judgment.`,
    whatHappened: `${source} published an update in ${category}: ${item.summary}`,
    whyItMatters: item.whyItMatters || `It matters because ${category} signals can affect tool adoption, model roadmaps, and platform strategy.`,
    whoShouldCare: `${audience} should track this signal, especially teams watching ${tags || category}.`,
    watchNext: `Watch whether this turns into developer adoption, competitor response, research replication, enterprise deployment, or platform-level follow-up.`
  };
}

function audienceForCategory(category: DisplayItem["category"], language: Language) {
  const zh = {
    coding_ai: "开发者、工程负责人和 AI 工具团队",
    image_ai: "设计师、创意技术团队和多模态产品经理",
    video_ai: "视频创作者、内容平台和生成式媒体团队",
    research_papers: "研究员、模型团队和技术战略负责人",
    models_products: "产品团队、创业者和平台生态观察者",
    business_investment: "创始人、投资人和行业策略团队",
    tools_apps: "效率工具团队、运营团队和应用层创业者"
  };
  const en = {
    coding_ai: "developers, engineering leads, and AI tooling teams",
    image_ai: "designers, creative technologists, and multimodal product teams",
    video_ai: "video creators, content platforms, and generative media teams",
    research_papers: "researchers, model teams, and technical strategy leads",
    models_products: "product teams, founders, and platform ecosystem watchers",
    business_investment: "founders, investors, and market strategy teams",
    tools_apps: "workflow tooling teams, operators, and application-layer founders"
  };

  return language === "zh" ? zh[category] : en[category];
}
