const tierScore = { S: 100, A: 82, B: 62, C: 35 };
const builderTerms = [
  "api",
  "sdk",
  "developer",
  "developers",
  "deploy",
  "deployment",
  "benchmark",
  "inference",
  "model",
  "agent",
  "workflow",
  "workflows",
  "tool",
  "release",
  "changelog",
  "open source",
  "latency",
  "eval",
  "evaluation",
  "production",
  "enterprise"
];
const impactTerms = [
  "launch",
  "release",
  "partnership",
  "funding",
  "safety",
  "governance",
  "frontier",
  "state of the art",
  "benchmark",
  "open weight",
  "research"
];
const actionTerms = [
  "use",
  "build",
  "deploy",
  "integrate",
  "available",
  "download",
  "api",
  "github",
  "docs",
  "guide",
  "tutorial",
  "try"
];

export function scoreCandidate(candidate) {
  const text = `${candidate.title_en ?? candidate.title ?? ""} ${candidate.summary_en ?? candidate.summary ?? ""}`.toLowerCase();
  const authorityTier = candidate.authority_tier ?? "C";
  const sourceScore = tierScore[authorityTier] ?? 0;
  const builderRelevanceScore = keywordScore(text, builderTerms);
  const impactScore = keywordScore(text, impactTerms);
  const actionabilityScore = keywordScore(text, actionTerms);
  const noveltyScore = candidate.published_at || candidate.publishedAt ? 80 : 55;
  const contentQualityScore = text.length >= 160 ? 85 : text.length >= 80 ? 65 : 45;
  const penalties = [];

  let weighted =
    sourceScore * 0.25 +
    builderRelevanceScore * 0.25 +
    impactScore * 0.20 +
    actionabilityScore * 0.15 +
    noveltyScore * 0.10 +
    contentQualityScore * 0.05;

  if (authorityTier === "C") {
    penalties.push("community_source_requires_verification");
    weighted -= 20;
  }

  if (!candidate.source_pool_id) {
    penalties.push("unknown_source_pool");
    weighted -= 25;
  }

  if (!candidate.original_url && !candidate.originalUrl && !candidate.source_url && !candidate.sourceUrl) {
    penalties.push("missing_source_url");
    weighted -= 15;
  }

  const qualityScore = clamp(Math.round(weighted));

  return {
    quality_score: qualityScore,
    source_score: Math.round(sourceScore),
    builder_relevance_score: Math.round(builderRelevanceScore),
    actionability_score: Math.round(actionabilityScore),
    novelty_score: Math.round(noveltyScore),
    impact_score: Math.round(impactScore),
    content_quality_score: Math.round(contentQualityScore),
    dedupe_confidence: candidate.dedupe_confidence ?? 1,
    penalties,
    ranking_reason: buildRankingReason(authorityTier, qualityScore, penalties),
    source_pool_id: candidate.source_pool_id ?? null,
    authority_tier: authorityTier,
    canonical_id: candidate.canonical_id ?? null
  };
}

function keywordScore(text, terms) {
  const hits = terms.filter((term) => text.includes(term)).length;
  return clamp(35 + hits * 13);
}

function buildRankingReason(authorityTier, qualityScore, penalties) {
  const authority = authorityTier === "S" ? "authoritative primary source" : `tier ${authorityTier} source`;
  const penaltyText = penalties.length ? ` with penalties: ${penalties.join(", ")}` : "";
  return `Selected from ${authority}; quality score ${qualityScore}${penaltyText}.`;
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}
