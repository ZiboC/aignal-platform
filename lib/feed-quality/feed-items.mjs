import { canonicalizeCandidates } from "./canonicalize.mjs";
import { scoreCandidate } from "./scoring.mjs";

const sourceNameAliases = new Map([
  ["openai blog", "openai_news"],
  ["anthropic news", "claude_release_notes"],
  ["hugging face blog", "hugging_face_hub"],
  ["arxiv cs.ai", "arxiv_api"],
  ["arxiv cs.cl", "arxiv_api"]
]);

export function resolveSourceMetadata(sourcePool, sourceName) {
  const normalizedName = normalizeSourceName(sourceName);
  const byName = sourcePool.sources.find((source) => normalizeSourceName(source.name) === normalizedName);
  if (byName) return byName;

  const aliasId = sourceNameAliases.get(normalizedName);
  if (!aliasId) return null;

  return sourcePool.sources.find((source) => source.id === aliasId) ?? null;
}

export function enrichFeedItemsWithQuality(items, sourcePool) {
  return analyzeFeedItemsWithQuality(items, sourcePool).items;
}

export function analyzeFeedItemsWithQuality(items, sourcePool) {
  const candidates = items.map((item) => {
    const source = item.source_pool_id
      ? sourcePool.sources.find((entry) => entry.id === item.source_pool_id)
      : resolveSourceMetadata(sourcePool, item.source_name ?? item.sourceName);

    return {
      ...item,
      source_pool_id: item.source_pool_id ?? source?.id ?? null,
      authority_tier: item.authority_tier ?? source?.authority_tier ?? "C"
    };
  });

  const canonical = canonicalizeCandidates(candidates);
  return {
    items: canonical.items.map((item) => ({
      ...item,
      ...scoreCandidate(item)
    })),
    duplicateGroups: canonical.duplicateGroups
  };
}

function normalizeSourceName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}
