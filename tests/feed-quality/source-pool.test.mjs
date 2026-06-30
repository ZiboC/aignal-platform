import assert from "node:assert/strict";
import test from "node:test";
import { getSourcesForCategory, validateSourcePool } from "../../lib/feed-quality/source-pool.mjs";

const validPool = {
  schema_version: 1,
  updated_at: "2026-06-10",
  categories: [
    { id: "coding_ai", label_zh: "写代码 AI", label_en: "Coding AI", source_ids: ["openai_blog"] }
  ],
  sources: [
    {
      id: "openai_blog",
      name: "OpenAI Blog",
      url: "https://openai.com/news/rss.xml",
      category_ids: ["coding_ai"],
      authority_tier: "S",
      source_type: "official_blog_rss",
      access_method: "rss",
      refresh_cadence: "daily",
      verification_rule: "Official OpenAI announcements."
    }
  ]
};

test("validateSourcePool accepts a valid source pool", () => {
  const result = validateSourcePool(validPool);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.stats.categoryCount, 1);
  assert.equal(result.stats.sourceCount, 1);
});

test("validateSourcePool reports missing category source references", () => {
  const pool = structuredClone(validPool);
  pool.categories[0].source_ids.push("missing_source");
  const result = validateSourcePool(pool);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /missing_source/);
});

test("validateSourcePool reports invalid source category references", () => {
  const pool = structuredClone(validPool);
  pool.sources[0].category_ids.push("missing_category");
  const result = validateSourcePool(pool);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /missing_category/);
});

test("getSourcesForCategory returns category sources in registry order", () => {
  const result = getSourcesForCategory(validPool, "coding_ai");
  assert.deepEqual(result.map((source) => source.id), ["openai_blog"]);
});
