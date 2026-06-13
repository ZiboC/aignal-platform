import { resolveSourceMetadata } from "./feed-items.mjs";

const collectableTiers = new Set(["S", "A"]);

export function getCollectableFeedSources(sourcePool, { legacySources = [] } = {}) {
  const selected = [];

  for (const source of sourcePool.sources ?? []) {
    if (!collectableTiers.has(source.authority_tier)) continue;
    if (source.access_method !== "rss") continue;
    selected.push(toFeedSource(source));
  }

  for (const legacySource of legacySources) {
    const metadata = resolveSourceMetadata(sourcePool, legacySource.name);
    selected.push({
      name: legacySource.name,
      url: legacySource.url,
      category: legacySource.category,
      categories: metadata?.category_ids ?? [legacySource.category],
      sourcePoolId: metadata?.id ?? null,
      authorityTier: metadata?.authority_tier ?? "C"
    });
  }

  return dedupeByUrl(selected);
}

function toFeedSource(source) {
  return {
    name: source.name,
    url: source.url,
    category: source.category_ids[0],
    categories: source.category_ids,
    sourcePoolId: source.id,
    authorityTier: source.authority_tier
  };
}

function dedupeByUrl(sources) {
  const seen = new Set();
  const deduped = [];

  for (const source of sources) {
    const key = normalizeUrl(source.url);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(source);
  }

  return deduped;
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    if (url.pathname !== "/" && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
    url.hash = "";
    return url.toString().toLowerCase();
  } catch {
    return String(value ?? "").trim().replace(/\/$/, "").toLowerCase();
  }
}
