import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFreshnessWindow,
  ensureFeedItemImage,
  filterFreshRecords,
  selectFreshRecordsWithFallback
} from "../../lib/feed-quality/fresh-feed.mjs";

test("buildFreshnessWindow anchors a historical date at the end of that day", () => {
  const window = buildFreshnessWindow({ date: "2026-06-10", now: new Date("2026-06-13T13:00:00.000Z"), hours: 36 });

  assert.equal(window.end.toISOString(), "2026-06-10T23:59:59.999Z");
  assert.equal(window.start.toISOString(), "2026-06-09T11:59:59.999Z");
});

test("buildFreshnessWindow anchors today's feed at the run time", () => {
  const now = new Date("2026-06-13T13:00:00.000Z");
  const window = buildFreshnessWindow({ date: "2026-06-13", now, hours: 36 });

  assert.equal(window.end.toISOString(), "2026-06-13T13:00:00.000Z");
  assert.equal(window.start.toISOString(), "2026-06-12T01:00:00.000Z");
});

test("filterFreshRecords keeps only records inside the freshness window", () => {
  const records = [
    { title: "fresh", publishedAt: "2026-06-13T08:00:00.000Z" },
    { title: "old", publishedAt: "2026-06-10T08:00:00.000Z" },
    { title: "future", publishedAt: "2026-06-14T08:00:00.000Z" }
  ];

  const filtered = filterFreshRecords(records, {
    date: "2026-06-13",
    now: new Date("2026-06-13T13:00:00.000Z"),
    hours: 36
  });

  assert.deepEqual(filtered.map((record) => record.title), ["fresh"]);
});

test("selectFreshRecordsWithFallback expands the window when the primary window is empty", () => {
  const records = [
    { title: "older but usable", publishedAt: "2026-07-03T18:00:00.000Z" },
    { title: "too old", publishedAt: "2026-06-27T18:00:00.000Z" }
  ];

  const selected = selectFreshRecordsWithFallback(records, {
    date: "2026-07-05",
    now: new Date("2026-07-05T13:00:00.000Z"),
    hours: 36,
    fallbackHours: 168,
    minRecords: 1
  });

  assert.equal(selected.usedFallback, true);
  assert.equal(selected.windowHours, 168);
  assert.equal(selected.primaryCount, 0);
  assert.deepEqual(selected.records.map((record) => record.title), ["older but usable"]);
});

test("selectFreshRecordsWithFallback keeps the primary window when it has enough records", () => {
  const records = [
    { title: "fresh", publishedAt: "2026-07-05T12:00:00.000Z" },
    { title: "older", publishedAt: "2026-07-03T18:00:00.000Z" }
  ];

  const selected = selectFreshRecordsWithFallback(records, {
    date: "2026-07-05",
    now: new Date("2026-07-05T13:00:00.000Z"),
    hours: 36,
    fallbackHours: 168,
    minRecords: 1
  });

  assert.equal(selected.usedFallback, false);
  assert.equal(selected.windowHours, 36);
  assert.equal(selected.primaryCount, 1);
  assert.deepEqual(selected.records.map((record) => record.title), ["fresh"]);
});

test("ensureFeedItemImage preserves source images", () => {
  const item = ensureFeedItemImage({
    category: "coding_ai",
    image_url: "https://example.com/image.png",
    image_source: "source"
  });

  assert.equal(item.image_url, "https://example.com/image.png");
  assert.equal(item.image_source, "source");
});

test("ensureFeedItemImage adds a category fallback when no image is available", () => {
  const item = ensureFeedItemImage({
    category: "coding_ai",
    image_url: null,
    image_source: null
  });

  assert.equal(item.image_url, "/images/fallbacks/coding-ai.svg");
  assert.equal(item.image_source, "fallback");
});
