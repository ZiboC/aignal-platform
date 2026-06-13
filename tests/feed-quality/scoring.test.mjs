import assert from "node:assert/strict";
import test from "node:test";
import { scoreCandidate } from "../../lib/feed-quality/scoring.mjs";

test("scoreCandidate rewards authoritative builder-relevant signals", () => {
  const result = scoreCandidate({
    title_en: "NVIDIA releases TensorRT inference update for production AI deployment",
    summary_en: "The release improves inference latency and deployment workflows for developers.",
    authority_tier: "S",
    category: "tools_apps",
    source_pool_id: "nvidia_developer_blog",
    original_url: "https://developer.nvidia.com/blog/example"
  });

  assert.equal(result.authority_tier, "S");
  assert.ok(result.quality_score >= 65);
  assert.match(result.ranking_reason, /authoritative/i);
});

test("scoreCandidate penalizes weak discovery-only candidates", () => {
  const result = scoreCandidate({
    title_en: "Cool AI app is trending",
    summary_en: "People are talking about it.",
    authority_tier: "C",
    category: "tools_apps",
    source_pool_id: "community_thread"
  });

  assert.ok(result.quality_score < 65);
  assert.ok(result.penalties.includes("community_source_requires_verification"));
});

test("scoreCandidate rejects items that are not matched to the source pool", () => {
  const result = scoreCandidate({
    title_en: "Major model update for developers",
    summary_en: "The update includes deployment workflows, benchmark notes, and API changes.",
    authority_tier: "C",
    category: "models_products",
    source_pool_id: null,
    original_url: "https://example.com/model-update"
  });

  assert.ok(result.quality_score < 65);
  assert.ok(result.penalties.includes("unknown_source_pool"));
});
