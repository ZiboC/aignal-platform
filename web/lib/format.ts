import type { DisplayItem, FeedItem, Language } from "./types";

export function toDisplayItem(item: FeedItem, language: Language): DisplayItem {
  return {
    id: item.id,
    category: item.category,
    title: language === "zh" ? item.title_zh : item.title_en,
    summary: language === "zh" ? item.summary_zh : item.summary_en,
    whyItMatters: language === "zh" ? item.why_it_matters_zh : item.why_it_matters_en,
    sourceName: item.source_name,
    readingUrl: item.original_url ?? item.source_url ?? null,
    publishedAt: item.published_at,
    imageUrl: item.image_url ?? null,
    imageSource: item.image_source ?? null,
    confidence: item.confidence ?? null,
    tags: item.tags
  };
}

export function formatDate(value: string, language: Language) {
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function formatDateOnly(value: string, language: Language) {
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
}

export function formatDateKey(value: string, language: Language) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return formatDateOnly(new Date(Date.UTC(year, month - 1, day, 12)).toISOString(), language);
}

export function formatDateTime(value: string, language: Language) {
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatConfidence(value: number | null) {
  if (value === null) return null;
  return `${Math.round(value * 100)}%`;
}

export function isLocalImage(url: string | null) {
  return Boolean(url && url.startsWith("/"));
}
