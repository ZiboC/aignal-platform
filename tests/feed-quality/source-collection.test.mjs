import assert from "node:assert/strict";
import test from "node:test";
import { collectSourceRecords, parseRSSRecords } from "../../lib/feed-collectors/source-collection.mjs";

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

  assert.equal(records.length, 2);
  assert.deepEqual(records.map((record) => record.sourcePoolId).sort(), ["nvidia_blog", "qwen_blog"]);
});
