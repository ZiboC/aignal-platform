import assert from "node:assert/strict";
import test from "node:test";
import {
  collectAdapterRecords,
  extractHTMLIndexRecords,
  extractHuggingFaceOrgRecords,
  getAdapterSources
} from "../../lib/feed-collectors/source-adapters.mjs";

const sourcePool = {
  sources: [
    {
      id: "qwen_blog",
      name: "Qwen Blog",
      url: "https://qwenlm.github.io/blog/",
      category_ids: ["models_products", "image_ai", "video_ai"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "unsupported",
      name: "Unsupported",
      url: "https://example.com/unsupported",
      category_ids: ["tools_apps"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "community_html",
      name: "Community HTML",
      url: "https://example.com/community",
      category_ids: ["tools_apps"],
      authority_tier: "C",
      access_method: "html"
    },
    {
      id: "qwen_hugging_face_org",
      name: "Qwen Hugging Face Organization",
      url: "https://huggingface.co/Qwen",
      category_ids: ["models_products", "image_ai"],
      authority_tier: "A",
      access_method: "hub_api_or_html"
    }
  ]
};

const html = `
<html>
<head>
  <meta property="og:image" content="/og-default.png">
  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@type":"BlogPosting",
    "headline":"Qwen Image Edit model is now available",
    "description":"Qwen released a new image editing model for developers.",
    "datePublished":"2026-06-14T12:00:00Z",
    "url":"/blog/qwen-image-edit/",
    "image":"/images/qwen-edit.png"
  }
  </script>
</head>
<body>
  <a href="/blog/qwen-video-2026/">Qwen Video generation model update</a>
  <time datetime="2026-06-13T16:00:00Z">June 13, 2026</time>
  <a href="/about">About</a>
</body>
</html>`;

test("getAdapterSources selects supported S/A HTML sources", () => {
  const sources = getAdapterSources(sourcePool);

  assert.deepEqual(sources.map((source) => source.id), ["qwen_blog", "qwen_hugging_face_org"]);
});

test("extractHTMLIndexRecords extracts JSON-LD and linked article candidates", () => {
  const records = extractHTMLIndexRecords(html, sourcePool.sources[0], { limit: 5 });

  assert.equal(records.length, 2);
  assert.equal(records[0].title, "Qwen Image Edit model is now available");
  assert.equal(records[0].sourcePoolId, "qwen_blog");
  assert.equal(records[0].authorityTier, "S");
  assert.equal(records[0].imageUrl, "https://qwenlm.github.io/images/qwen-edit.png");
  assert.equal(records[0].publishedAt, "2026-06-14T12:00:00.000Z");
  assert.equal(records[1].originalUrl, "https://qwenlm.github.io/blog/qwen-video-2026/");
  assert.equal(records[1].fallbackCategory, "models_products");
});

test("collectAdapterRecords fetches supported adapter sources", async () => {
  const records = await collectAdapterRecords(sourcePool, {
    fetchImpl: async (url) => {
      if (String(url).includes("/api/models")) {
        return Response.json([
          {
            id: "Qwen/Qwen-Image",
            lastModified: "2026-06-14T10:30:00.000Z",
            tags: ["text-to-image", "qwen"]
          }
        ]);
      }
      return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    },
    limitPerSource: 5
  });

  assert.equal(records.length, 3);
  assert.equal(records[0].sourceName, "Qwen Blog");
});

test("extractHTMLIndexRecords ignores undated product-page links", () => {
  const records = extractHTMLIndexRecords(`
    <html><body>
      <a href="/ai">AI workflow automation platform</a>
      <a href="/agents">Create your own AI assistants for any task</a>
    </body></html>
  `, sourcePool.sources[0], { limit: 5 });

  assert.equal(records.length, 0);
});

test("extractHTMLIndexRecords ignores site-level JSON-LD metadata", () => {
  const records = extractHTMLIndexRecords(`
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "MiniMax AI | AGI Research, Product Updates & Partner News",
      "url": "https://www.minimaxi.com/en/news",
      "dateModified": "2026-06-14T20:56:30Z"
    }
    </script>
  `, sourcePool.sources[0], { limit: 5 });

  assert.equal(records.length, 0);
});

test("extractHuggingFaceOrgRecords maps model API results to source records", () => {
  const records = extractHuggingFaceOrgRecords([
    {
      id: "Qwen/Qwen2.5-VL-72B-Instruct",
      lastModified: "2026-06-14T10:30:00.000Z",
      tags: ["image-text-to-text", "vision-language", "qwen"],
      downloads: 12345,
      likes: 678
    }
  ], sourcePool.sources[3]);

  assert.equal(records.length, 1);
  assert.equal(records[0].title, "Qwen/Qwen2.5-VL-72B-Instruct updated on Hugging Face");
  assert.equal(records[0].sourcePoolId, "qwen_hugging_face_org");
  assert.equal(records[0].authorityTier, "A");
  assert.equal(records[0].publishedAt, "2026-06-14T10:30:00.000Z");
  assert.equal(records[0].fallbackCategory, "models_products");
  assert.equal(records[0].originalUrl, "https://huggingface.co/Qwen/Qwen2.5-VL-72B-Instruct");
});
