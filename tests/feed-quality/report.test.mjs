import assert from "node:assert/strict";
import test from "node:test";
import { buildQualityReport } from "../../lib/feed-quality/report.mjs";

test("buildQualityReport records accepted, rejected, and category gaps", () => {
  const report = buildQualityReport({
    date: "2026-06-10",
    categories: ["coding_ai", "image_ai"],
    duplicateGroups: [{ canonical_id: "url:https://example.com/a", count: 2 }],
    scoredItems: [
      {
        id: "a",
        category: "coding_ai",
        quality_score: 80,
        source_pool_id: "openai_blog",
        authority_tier: "S",
        penalties: []
      },
      {
        id: "b",
        category: "image_ai",
        quality_score: 50,
        source_pool_id: "community",
        authority_tier: "C",
        penalties: ["community_source_requires_verification"]
      }
    ],
    minQualityScore: 65
  });

  assert.equal(report.accepted_count, 1);
  assert.equal(report.rejected_count, 1);
  assert.equal(report.coverage_gaps.length, 1);
  assert.equal(report.coverage_gaps[0].category, "image_ai");
  assert.equal(report.duplicate_groups.length, 1);
  assert.equal(report.rejection_reasons.community_source_requires_verification, 1);
});

test("buildQualityReport warns when candidates are missing source pool matches", () => {
  const report = buildQualityReport({
    date: "2026-06-10",
    categories: ["models_products"],
    scoredItems: [
      {
        id: "a",
        category: "models_products",
        quality_score: 20,
        source_pool_id: null,
        authority_tier: "C",
        penalties: ["unknown_source_pool"]
      }
    ],
    minQualityScore: 65
  });

  assert.equal(report.rejection_reasons.unknown_source_pool, 1);
  assert.deepEqual(report.warnings, ["1 candidate was not matched to the source pool"]);
});
