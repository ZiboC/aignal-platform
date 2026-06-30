import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeFeedItemsWithQuality,
  enrichFeedItemsWithQuality,
  resolveSourceMetadata
} from "../../lib/feed-quality/feed-items.mjs";

const sourcePool = {
  categories: [
    { id: "models_products", source_ids: ["openai_news", "google_ai_blog", "claude_release_notes"] },
    { id: "research_papers", source_ids: ["arxiv_api"] },
    { id: "tools_apps", source_ids: ["hugging_face_hub"] }
  ],
  sources: [
    { id: "openai_news", name: "OpenAI News", authority_tier: "S" },
    { id: "google_ai_blog", name: "Google AI Blog", authority_tier: "S" },
    { id: "claude_release_notes", name: "Claude Release Notes", authority_tier: "S" },
    { id: "arxiv_api", name: "arXiv API", authority_tier: "S" },
    { id: "hugging_face_hub", name: "Hugging Face Hub", authority_tier: "A" }
  ]
};

test("resolveSourceMetadata maps legacy feed source names to source pool ids", () => {
  assert.equal(resolveSourceMetadata(sourcePool, "OpenAI Blog").id, "openai_news");
  assert.equal(resolveSourceMetadata(sourcePool, "Anthropic News").id, "claude_release_notes");
  assert.equal(resolveSourceMetadata(sourcePool, "Hugging Face Blog").id, "hugging_face_hub");
  assert.equal(resolveSourceMetadata(sourcePool, "arXiv cs.AI").id, "arxiv_api");
  assert.equal(resolveSourceMetadata(sourcePool, "arXiv cs.CL").id, "arxiv_api");
});

test("enrichFeedItemsWithQuality adds quality fields and dedupes duplicate events", () => {
  const analysis = analyzeFeedItemsWithQuality([
    {
      id: "a",
      category: "models_products",
      title_en: "OpenAI releases a production API update for developers",
      summary_en: "The release improves deployment workflows and API behavior for production builders.",
      source_name: "OpenAI Blog",
      original_url: "https://openai.com/news/api-update",
      source_url: "https://openai.com/news/api-update"
    },
    {
      id: "b",
      category: "models_products",
      title_en: "OpenAI releases production API update for developers",
      summary_en: "Coverage of the same release.",
      source_name: "Google AI Blog",
      original_url: "https://example.com/openai-api-update",
      source_url: "https://example.com/openai-api-update"
    }
  ], sourcePool);
  const items = analysis.items;

  assert.equal(items.length, 1);
  assert.equal(items[0].source_pool_id, "openai_news");
  assert.equal(items[0].authority_tier, "S");
  assert.ok(items[0].quality_score >= 65);
  assert.ok(items[0].canonical_id);
  assert.equal(items[0].supporting_sources.length, 2);
  assert.equal(analysis.duplicateGroups.length, 1);
});

test("enrichFeedItemsWithQuality marks unknown sources with penalties", () => {
  const [item] = enrichFeedItemsWithQuality([
    {
      id: "a",
      category: "models_products",
      title_en: "Unknown model update",
      summary_en: "A model update with no source pool match.",
      source_name: "Unknown Source",
      original_url: "https://example.com/unknown"
    }
  ], sourcePool);

  assert.equal(item.source_pool_id, null);
  assert.equal(item.authority_tier, "C");
  assert.ok(item.penalties.includes("unknown_source_pool"));
});
