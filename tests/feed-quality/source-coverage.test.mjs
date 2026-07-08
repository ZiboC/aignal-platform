import assert from "node:assert/strict";
import test from "node:test";
import { buildSourceCoverageReport, renderSourceCoverageReportMarkdown } from "../../lib/feed-quality/source-coverage.mjs";

const sourcePool = {
  categories: [
    {
      id: "coding_ai",
      label_en: "Coding AI",
      label_zh: "写代码 AI",
      source_ids: ["source_a", "source_b"]
    },
    {
      id: "research_papers",
      label_en: "Research",
      label_zh: "研究论文",
      source_ids: ["source_c"]
    }
  ],
  sources: [
    {
      id: "source_a",
      name: "Source A",
      url: "https://example.com/a",
      category_ids: ["coding_ai"],
      authority_tier: "S",
      access_method: "rss"
    },
    {
      id: "source_b",
      name: "Source B",
      url: "https://example.com/b",
      category_ids: ["coding_ai"],
      authority_tier: "A",
      access_method: "html"
    },
    {
      id: "source_c",
      name: "Source C",
      url: "https://example.com/c",
      category_ids: ["research_papers"],
      authority_tier: "A",
      access_method: "manual"
    }
  ]
};

const freshA = {
  title: "Fresh coding agent release",
  summary: "A coding AI agent release for developers.",
  sourceName: "Source A",
  sourcePoolId: "source_a",
  sourceUrl: "https://example.com/a/fresh",
  originalUrl: "https://example.com/a/fresh",
  publishedAt: "2026-07-07T10:00:00.000Z",
  fallbackCategory: "coding_ai"
};
const staleA = {
  ...freshA,
  title: "Old coding agent release",
  originalUrl: "https://example.com/a/old",
  publishedAt: "2026-06-30T10:00:00.000Z"
};
const duplicateB = {
  ...freshA,
  sourceName: "Source B",
  sourcePoolId: "source_b",
  sourceUrl: "https://example.com/a/fresh",
  originalUrl: "https://example.com/a/fresh"
};
const cappedB = {
  ...freshA,
  title: "Second coding agent release",
  sourceName: "Source B",
  sourcePoolId: "source_b",
  sourceUrl: "https://example.com/b/fresh",
  originalUrl: "https://example.com/b/fresh"
};

test("buildSourceCoverageReport explains collection, freshness, dedupe, and final selection by source", () => {
  const report = buildSourceCoverageReport({
    date: "2026-07-07",
    sourcePool,
    collectionDiagnostics: {
      attempts: [
        { collector: "rss", source_id: "source_a", source_name: "Source A", status: "ok", candidate_count: 2 },
        { collector: "adapter", source_id: "source_b", source_name: "Source B", status: "ok", candidate_count: 1 }
      ]
    },
    allRecords: [freshA, staleA, duplicateB, cappedB],
    freshRecords: [freshA, duplicateB, cappedB],
    dedupedRecords: [freshA, cappedB],
    selectedRecords: [freshA],
    finalItems: [{
      source_pool_id: "source_a",
      source_name: "Source A",
      category: "coding_ai",
      quality_score: 72
    }],
    freshnessWindow: {
      start: new Date("2026-07-06T12:00:00.000Z"),
      end: new Date("2026-07-07T23:59:59.999Z"),
      hours: 36
    },
    selectionDiagnostics: {
      not_selected: [
        { record: cappedB, reason: "category_cap" }
      ]
    },
    categoryCoverageTarget: 1,
    minQualityScore: 65
  });

  assert.equal(report.summary.total_pool_sources, 3);
  assert.equal(report.summary.attempted_sources, 2);
  assert.equal(report.summary.sources_with_candidates, 2);
  assert.equal(report.summary.stale_filtered_records, 1);
  assert.equal(report.summary.duplicate_filtered_records, 1);
  assert.equal(report.summary.selection_filtered_records, 1);
  assert.equal(report.summary.selection_filtered_by_reason.category_cap, 1);
  assert.equal(report.summary.quality_filtered_records, 0);
  assert.equal(report.summary.final_unique_sources, 1);
  assert.equal(report.sources.find((source) => source.id === "source_a").final_item_count, 1);
  assert.equal(report.sources.find((source) => source.id === "source_b").duplicate_filtered_count, 1);
  assert.equal(report.sources.find((source) => source.id === "source_b").selection_filtered_reasons.category_cap, 1);
  assert.equal(report.sources.find((source) => source.id === "source_c").attempted, false);
  assert.equal(report.sources.find((source) => source.id === "source_c").exclusion_reason, "not_attempted");
  assert.equal(report.categories.find((category) => category.id === "coding_ai").coverage_target_met, true);
  assert.equal(report.categories.find((category) => category.id === "research_papers").coverage_target_met, false);
  assert.match(report.pipeline_notes.join(" "), /quality gate/i);
});

test("renderSourceCoverageReportMarkdown highlights the dominant coverage bottleneck", () => {
  const markdown = renderSourceCoverageReportMarkdown({
    date: "2026-07-07",
    summary: {
      total_pool_sources: 3,
      attempted_sources: 2,
      sources_with_candidates: 2,
      fresh_candidate_sources: 2,
      final_unique_sources: 1,
      total_candidate_records: 3,
      fresh_candidate_records: 2,
      stale_filtered_records: 1,
      duplicate_filtered_records: 1,
      quality_filtered_records: 0,
      selected_records: 1,
      final_items: 1
    },
    bottlenecks: [
      { reason: "not_attempted", source_count: 1 },
      { reason: "duplicate_filtered", source_count: 1 }
    ],
    categories: [],
    sources: [],
    pipeline_notes: ["No pre-selection quality gate is applied in generate-feed."]
  });

  assert.match(markdown, /Aignal Source Coverage Diagnostic 2026-07-07/);
  assert.match(markdown, /not_attempted: 1 source/);
  assert.match(markdown, /No pre-selection quality gate/);
});
