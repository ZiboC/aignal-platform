import assert from "node:assert/strict";
import test from "node:test";
import { buildSourceHealthReport, renderSourceHealthReportMarkdown } from "../../lib/feed-quality/source-health.mjs";

const sourcePool = {
  schema_version: 1,
  categories: [
    {
      id: "coding_ai",
      label_zh: "写代码 AI",
      label_en: "Coding AI",
      source_ids: ["github_changelog", "broken_vendor", "manual_vendor"]
    },
    {
      id: "image_ai",
      label_zh: "图片 AI",
      label_en: "Image AI",
      source_ids: ["manual_vendor"]
    }
  ],
  sources: [
    {
      id: "github_changelog",
      name: "GitHub Changelog",
      url: "https://github.blog/changelog/feed/",
      category_ids: ["coding_ai"],
      authority_tier: "S",
      access_method: "rss"
    },
    {
      id: "broken_vendor",
      name: "Broken Vendor",
      url: "https://example.com/missing",
      category_ids: ["coding_ai"],
      authority_tier: "A",
      access_method: "rss"
    },
    {
      id: "manual_vendor",
      name: "Manual Vendor",
      url: "https://example.com/news",
      category_ids: ["coding_ai", "image_ai"],
      authority_tier: "B",
      access_method: "html"
    }
  ]
};

test("buildSourceHealthReport summarizes reachable, failing, and adapter-needed sources", () => {
  const report = buildSourceHealthReport({
    sourcePool,
    checkedAt: "2026-06-12T12:00:00.000Z",
    results: [
      { sourceId: "github_changelog", ok: true, status: 200, finalUrl: "https://github.blog/changelog/feed/" },
      { sourceId: "broken_vendor", ok: false, status: 404, error: "Not Found" },
      { sourceId: "manual_vendor", ok: true, status: 200, finalUrl: "https://example.com/news" }
    ]
  });

  assert.equal(report.checked_at, "2026-06-12T12:00:00.000Z");
  assert.equal(report.summary.total_sources, 3);
  assert.equal(report.summary.reachable_sources, 2);
  assert.equal(report.summary.failing_sources, 1);
  assert.equal(report.summary.directly_collectable_sources, 2);
  assert.equal(report.summary.adapter_needed_sources, 1);
  assert.deepEqual(report.summary.status_counts, { reachable: 2, failing: 1 });

  const coding = report.categories.find((category) => category.id === "coding_ai");
  assert.equal(coding.source_count, 3);
  assert.equal(coding.reachable_count, 2);
  assert.equal(coding.failing_count, 1);
  assert.deepEqual(coding.failing_source_ids, ["broken_vendor"]);

  const image = report.categories.find((category) => category.id === "image_ai");
  assert.equal(image.directly_collectable_count, 0);
  assert.equal(image.adapter_needed_count, 1);
  assert.equal(image.coverage_status, "needs_adapter");
});

test("buildSourceHealthReport flags categories with no reachable sources", () => {
  const report = buildSourceHealthReport({
    sourcePool,
    checkedAt: "2026-06-12T12:00:00.000Z",
    results: [
      { sourceId: "github_changelog", ok: false, status: 500, error: "Server Error" },
      { sourceId: "broken_vendor", ok: false, status: 404, error: "Not Found" },
      { sourceId: "manual_vendor", ok: false, status: 403, error: "Forbidden" }
    ]
  });

  assert.deepEqual(report.coverage_gaps.map((gap) => gap.category_id), ["coding_ai", "image_ai"]);
  assert.equal(report.categories[0].coverage_status, "no_reachable_sources");
});

test("renderSourceHealthReportMarkdown highlights failing sources and category gaps", () => {
  const report = buildSourceHealthReport({
    sourcePool,
    checkedAt: "2026-06-12T12:00:00.000Z",
    results: [
      { sourceId: "github_changelog", ok: true, status: 200 },
      { sourceId: "broken_vendor", ok: false, status: 404, error: "Not Found" },
      { sourceId: "manual_vendor", ok: true, status: 200 }
    ]
  });

  const markdown = renderSourceHealthReportMarkdown(report);

  assert.match(markdown, /# Source Health Report/);
  assert.match(markdown, /Broken Vendor/);
  assert.match(markdown, /图片 AI/);
  assert.match(markdown, /needs_adapter/);
});
