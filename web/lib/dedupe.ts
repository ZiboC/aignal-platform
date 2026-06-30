import type { FeedItem } from "./types";

function normalizeUrl(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    url.hash = "";

    for (const key of Array.from(url.searchParams.keys())) {
      if (key.toLowerCase().startsWith("utm_")) {
        url.searchParams.delete(key);
      }
    }

    const normalized = url.toString().replace(/\/$/, "");
    return normalized.toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase();
  }
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function getCanonicalSignalKey(item: FeedItem) {
  return (
    normalizeUrl(item.original_url) ??
    normalizeUrl(item.source_url) ??
    `${normalizeText(item.source_name)}:${normalizeText(item.title_en || item.title_zh)}`
  );
}

export function dedupeSignals<T extends FeedItem>(items: T[]) {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    const key = getCanonicalSignalKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}
