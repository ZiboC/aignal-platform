const tierRank = { S: 4, A: 3, B: 2, C: 1 };

export function normalizeSignalUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value);
    url.hash = "";

    for (const key of Array.from(url.searchParams.keys())) {
      if (key.toLowerCase().startsWith("utm_")) {
        url.searchParams.delete(key);
      }
    }

    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return String(value).trim().replace(/\/$/, "").toLowerCase();
  }
}

export function normalizeSignalTitle(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function getCanonicalKey(candidate) {
  const url = normalizeSignalUrl(
    candidate.original_url ?? candidate.originalUrl ?? candidate.source_url ?? candidate.sourceUrl
  );
  if (url) return `url:${url}`;

  const title = normalizeSignalTitle(candidate.title_en ?? candidate.title ?? candidate.title_zh);
  return `title:${title}`;
}

export function canonicalizeCandidates(candidates) {
  const groups = new Map();
  const titleIndex = new Map();

  for (const candidate of candidates) {
    const key = findCanonicalGroupKey(candidate, groups, titleIndex);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
    indexTitle(candidate, key, titleIndex);
  }

  const items = [];
  const duplicateGroups = [];

  for (const [canonicalId, group] of groups) {
    const sorted = [...group].sort((a, b) => {
      const tierDelta = (tierRank[b.authority_tier] ?? 0) - (tierRank[a.authority_tier] ?? 0);
      if (tierDelta !== 0) return tierDelta;
      return String(a.id ?? "").localeCompare(String(b.id ?? ""));
    });
    const primary = sorted[0];
    const supportingSources = sorted.map((item) => ({
      source_pool_id: item.source_pool_id ?? null,
      source_name: item.source_name ?? item.sourceName ?? null,
      url: item.original_url ?? item.originalUrl ?? item.source_url ?? item.sourceUrl ?? null,
      authority_tier: item.authority_tier ?? null
    }));

    items.push({
      ...primary,
      canonical_id: canonicalId,
      supporting_sources: supportingSources,
      dedupe_confidence: group.length > 1 ? 0.95 : 1
    });

    if (group.length > 1) {
      duplicateGroups.push({
        canonical_id: canonicalId,
        count: group.length,
        kept_id: primary.id,
        duplicate_ids: sorted.slice(1).map((item) => item.id)
      });
    }
  }

  return { items, duplicateGroups };
}

function findCanonicalGroupKey(candidate, groups, titleIndex) {
  const urlKey = getCanonicalKey(candidate);
  if (groups.has(urlKey)) return urlKey;

  const title = normalizeSignalTitle(candidate.title_en ?? candidate.title ?? candidate.title_zh);
  if (!isUsableTitle(title)) return urlKey;

  const exactTitleKey = titleIndex.get(title);
  if (exactTitleKey) return exactTitleKey;

  for (const [indexedTitle, key] of titleIndex.entries()) {
    if (titleSimilarity(title, indexedTitle) >= 0.82) {
      return key;
    }
  }

  return urlKey;
}

function indexTitle(candidate, key, titleIndex) {
  const title = normalizeSignalTitle(candidate.title_en ?? candidate.title ?? candidate.title_zh);
  if (isUsableTitle(title)) titleIndex.set(title, key);
}

function isUsableTitle(title) {
  return title.split(" ").filter(Boolean).length >= 5;
}

function titleSimilarity(a, b) {
  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection += 1;
  }

  return intersection / Math.max(aTokens.size, bTokens.size);
}
