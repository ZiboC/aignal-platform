import assert from "node:assert/strict";
import test from "node:test";
import { getCollectableFeedSources } from "../../lib/feed-quality/source-selection.mjs";

const sourcePool = {
  sources: [
    {
      id: "nvidia_blog",
      name: "NVIDIA Blog",
      url: "https://feeds.feedburner.com/nvidiablog",
      category_ids: ["models_products", "image_ai"],
      authority_tier: "S",
      access_method: "rss"
    },
    {
      id: "openai_news",
      name: "OpenAI News",
      url: "https://openai.com/news/",
      category_ids: ["models_products"],
      authority_tier: "S",
      access_method: "rss_or_html"
    },
    {
      id: "vendor_updates",
      name: "Vendor Updates",
      url: "https://example.com/updates",
      category_ids: ["tools_apps"],
      authority_tier: "A",
      access_method: "rss_or_api"
    },
    {
      id: "community_source",
      name: "Community Source",
      url: "https://example.com/community.xml",
      category_ids: ["tools_apps"],
      authority_tier: "C",
      access_method: "rss"
    }
  ]
};

test("getCollectableFeedSources selects S/A rss sources from the source pool", () => {
  const sources = getCollectableFeedSources(sourcePool);

  assert.equal(sources[0].sourcePoolId, "nvidia_blog");
  assert.equal(sources[0].name, "NVIDIA Blog");
  assert.equal(sources[0].category, "models_products");
  assert.equal(sources[0].authorityTier, "S");
});

test("getCollectableFeedSources includes S/A RSS-like source pool entries", () => {
  const sources = getCollectableFeedSources(sourcePool);

  assert.deepEqual(sources.map((source) => source.sourcePoolId), [
    "nvidia_blog",
    "openai_news",
    "vendor_updates"
  ]);
});

test("getCollectableFeedSources keeps legacy feeds and resolves source metadata", () => {
  const sources = getCollectableFeedSources(sourcePool, {
    legacySources: [
      { name: "OpenAI Blog", url: "https://openai.com/news/rss.xml", category: "models_products" }
    ]
  });

  const openai = sources.find((source) => source.name === "OpenAI Blog");
  assert.equal(openai.sourcePoolId, "openai_news");
  assert.equal(openai.authorityTier, "S");
  assert.equal(openai.category, "models_products");
});

test("getCollectableFeedSources dedupes by normalized URL", () => {
  const sources = getCollectableFeedSources(sourcePool, {
    legacySources: [
      { name: "NVIDIA Blog duplicate", url: "https://feeds.feedburner.com/nvidiablog/", category: "models_products" }
    ]
  });

  assert.equal(sources.filter((source) => source.url.includes("nvidiablog")).length, 1);
});
