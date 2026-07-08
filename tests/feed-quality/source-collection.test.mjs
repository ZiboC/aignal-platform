import assert from "node:assert/strict";
import test from "node:test";
import { collectSourceRecords, collectSourceRecordsWithDiagnostics, parseRSSRecords } from "../../lib/feed-collectors/source-collection.mjs";

const sourcePool = {
  sources: [
    {
      id: "nvidia_blog",
      name: "NVIDIA Blog",
      url: "https://blogs.nvidia.com/feed/",
      category_ids: ["models_products"],
      authority_tier: "S",
      access_method: "rss"
    },
    {
      id: "qwen_blog",
      name: "Qwen Blog",
      url: "https://qwenlm.github.io/blog/",
      category_ids: ["models_products", "image_ai"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "openai_news",
      name: "OpenAI News",
      url: "https://openai.com/news/",
      category_ids: ["models_products"],
      authority_tier: "S",
      access_method: "rss_or_html"
    }
  ]
};

const rss = `<?xml version="1.0"?>
<rss><channel><item>
  <title>NVIDIA launches agentic inference update</title>
  <link>https://blogs.nvidia.com/blog/agentic-inference/</link>
  <description><![CDATA[<p>NVIDIA released an agentic inference update.</p><img src="https://blogs.nvidia.com/agentic.png">]]></description>
  <pubDate>Sun, 14 Jun 2026 13:00:00 GMT</pubDate>
</item></channel></rss>`;

const html = `<html><body>
  <a href="/blog/qwen-image/">Qwen Image generation model update</a>
  <time datetime="2026-06-14T11:00:00Z">June 14, 2026</time>
</body></html>`;

test("parseRSSRecords maps RSS items to collector records", () => {
  const records = parseRSSRecords(rss, sourcePool.sources[0], { date: "2026-06-14" });

  assert.equal(records.length, 1);
  assert.equal(records[0].sourcePoolId, "nvidia_blog");
  assert.equal(records[0].authorityTier, "S");
  assert.equal(records[0].fallbackCategory, "models_products");
  assert.equal(records[0].imageUrl, "https://blogs.nvidia.com/agentic.png");
  assert.equal(records[0].publishedAt, "2026-06-14T13:00:00.000Z");
});

test("collectSourceRecords combines RSS records and adapter records", async () => {
  const records = await collectSourceRecords(sourcePool, {
    date: "2026-06-14",
    legacySources: [],
    fetchImpl: async (url) => {
      if (String(url).includes("nvidia")) {
        return new Response(rss, { status: 200, headers: { "content-type": "application/rss+xml" } });
      }
      return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    },
    adapterLimitPerSource: 4
  });

  assert.equal(records.length, 3);
  assert.deepEqual(records.map((record) => record.sourcePoolId).sort(), ["nvidia_blog", "openai_news", "qwen_blog"]);
});

test("collectSourceRecordsWithDiagnostics reports RSS and adapter attempts", async () => {
  const result = await collectSourceRecordsWithDiagnostics(sourcePool, {
    date: "2026-06-14",
    legacySources: [],
    fetchImpl: async (url) => {
      if (String(url).includes("nvidia")) {
        return new Response(rss, { status: 200, headers: { "content-type": "application/rss+xml" } });
      }
      return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    },
    adapterLimitPerSource: 4
  });

  assert.equal(result.records.length, 3);
  assert.deepEqual(result.diagnostics.attempts.map((attempt) => [
    attempt.collector,
    attempt.source_id,
    attempt.status,
    attempt.candidate_count
  ]), [
    ["rss", "nvidia_blog", "ok", 1],
    ["rss", "openai_news", "ok", 1],
    ["adapter", "openai_news", "ok", 0],
    ["adapter", "qwen_blog", "ok", 1]
  ]);
});

test("collectSourceRecords falls back to HTML extraction for RSS-like source pool entries", async () => {
  const htmlIndex = `<html><head>
    <script type="application/ld+json">
    {
      "@context":"https://schema.org",
      "@type":"NewsArticle",
      "headline":"OpenAI releases a new model update",
      "description":"OpenAI shared a model update for developers.",
      "datePublished":"2026-06-14T15:00:00Z",
      "url":"/news/model-update/"
    }
    </script>
  </head><body></body></html>`;

  const records = await collectSourceRecords({ sources: [sourcePool.sources[2]] }, {
    date: "2026-06-14",
    legacySources: [],
    fetchImpl: async () => new Response(htmlIndex, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" }
    }),
    adapterLimitPerSource: 4
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].sourcePoolId, "openai_news");
  assert.equal(records[0].originalUrl, "https://openai.com/news/model-update/");
});
