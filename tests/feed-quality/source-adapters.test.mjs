import assert from "node:assert/strict";
import test from "node:test";
import {
  collectAdapterRecords,
  collectGitHubMarkdownRecords,
  collectHuggingFacePaperRecords,
  collectOfficialFeedRecords,
  collectPaperIndexRecords,
  collectProductPageRecords,
  collectVisualIndexRecords,
  extractArxivListRecords,
  extractHTMLIndexRecords,
  extractHuggingFaceOrgRecords,
  extractPaperIndexRecords,
  extractProductPageRecords,
  extractVisualIndexRecords,
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
    },
    {
      id: "openai_api_changelog",
      name: "OpenAI API Changelog",
      url: "https://developers.openai.com/api/docs/changelog",
      category_ids: ["coding_ai", "models_products"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "openai_news",
      name: "OpenAI News",
      url: "https://openai.com/news/",
      category_ids: ["coding_ai", "image_ai", "models_products"],
      authority_tier: "S",
      source_type: "official_news",
      access_method: "rss_or_html"
    },
    {
      id: "google_gemini_api_changelog",
      name: "Gemini API Changelog",
      url: "https://ai.google.dev/gemini-api/docs/changelog",
      category_ids: ["coding_ai", "models_products"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "google_deepmind_news",
      name: "Google DeepMind News",
      url: "https://deepmind.google/discover/blog/",
      category_ids: ["research_papers", "models_products", "image_ai", "video_ai"],
      authority_tier: "S",
      source_type: "official_research_blog",
      access_method: "rss_or_html"
    },
    {
      id: "google_ai_blog",
      name: "Google AI Blog",
      url: "https://blog.google/technology/ai/",
      category_ids: ["image_ai", "video_ai", "models_products", "business_investment"],
      authority_tier: "S",
      source_type: "official_blog",
      access_method: "rss_or_html"
    },
    {
      id: "cursor_changelog",
      name: "Cursor Changelog",
      url: "https://cursor.com/changelog",
      category_ids: ["coding_ai", "tools_apps"],
      authority_tier: "A",
      access_method: "html"
    },
    {
      id: "arxiv_cs_cv",
      name: "arXiv cs.CV",
      url: "https://arxiv.org/list/cs.CV/new",
      category_ids: ["image_ai", "video_ai", "research_papers"],
      authority_tier: "S",
      source_type: "paper_feed",
      access_method: "rss_or_api"
    },
    {
      id: "github_copilot_whats_new",
      name: "GitHub Copilot What's New",
      url: "https://github.com/features/copilot/whats-new",
      category_ids: ["coding_ai"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "lmarena",
      name: "LM Arena",
      url: "https://lmarena.ai/",
      category_ids: ["models_products", "image_ai", "video_ai", "coding_ai"],
      authority_tier: "A",
      source_type: "benchmark_leaderboard",
      access_method: "html_or_api"
    },
    {
      id: "claude_code_changelog",
      name: "Claude Code Changelog",
      url: "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md",
      category_ids: ["coding_ai"],
      authority_tier: "S",
      access_method: "github_raw_or_html"
    },
    {
      id: "hugging_face_papers",
      name: "Hugging Face Papers",
      url: "https://huggingface.co/papers/trending",
      category_ids: ["research_papers", "models_products", "tools_apps"],
      authority_tier: "A",
      access_method: "html_or_api"
    },
    {
      id: "openreview",
      name: "OpenReview",
      url: "https://openreview.net/",
      category_ids: ["research_papers"],
      authority_tier: "S",
      access_method: "api_or_html"
    },
    {
      id: "acl_anthology",
      name: "ACL Anthology",
      url: "https://aclanthology.org/",
      category_ids: ["research_papers"],
      authority_tier: "S",
      access_method: "html_or_metadata"
    },
    {
      id: "cvf_open_access",
      name: "CVF Open Access",
      url: "https://openaccess.thecvf.com/",
      category_ids: ["image_ai", "video_ai", "research_papers"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "pmlr",
      name: "Proceedings of Machine Learning Research",
      url: "https://proceedings.mlr.press/",
      category_ids: ["research_papers"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "neurips_proceedings",
      name: "NeurIPS Proceedings",
      url: "https://papers.nips.cc/",
      category_ids: ["research_papers"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "midjourney_updates",
      name: "Midjourney Updates",
      url: "https://updates.midjourney.com/",
      category_ids: ["image_ai"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "ideogram_blog",
      name: "Ideogram Blog",
      url: "https://docs.ideogram.ai/about-ideogram/blog-posts",
      category_ids: ["image_ai", "models_products"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "leonardo_ai_news",
      name: "Leonardo.Ai News",
      url: "https://leonardo.ai/news/",
      category_ids: ["image_ai", "tools_apps"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "black_forest_labs_announcements",
      name: "Black Forest Labs Announcements",
      url: "https://blackforestlabs.ai/announcements/",
      category_ids: ["image_ai", "models_products"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "artificial_analysis_text_to_video",
      name: "Artificial Analysis Text-to-Video Leaderboard",
      url: "https://artificialanalysis.ai/video/leaderboard/text-to-video",
      category_ids: ["video_ai"],
      authority_tier: "A",
      access_method: "html"
    },
    {
      id: "adobe_news",
      name: "Adobe News",
      url: "https://news.adobe.com/",
      category_ids: ["image_ai", "video_ai", "business_investment"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "nvidia_research",
      name: "NVIDIA Research",
      url: "https://www.nvidia.com/en-us/research/",
      category_ids: ["image_ai", "video_ai", "research_papers", "models_products"],
      authority_tier: "S",
      access_method: "html"
    },
    {
      id: "seedance_ai",
      name: "Seedance AI",
      url: "https://seed.bytedance.com/en/seedance",
      category_ids: ["video_ai", "image_ai", "models_products"],
      authority_tier: "S",
      source_type: "official_product_page",
      access_method: "html"
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

const sourceById = (id) => sourcePool.sources.find((source) => source.id === id);

test("getAdapterSources selects supported S/A HTML sources", () => {
  const sources = getAdapterSources(sourcePool);

  assert.deepEqual(sources.map((source) => source.id), [
    "qwen_blog",
    "qwen_hugging_face_org",
    "openai_api_changelog",
    "openai_news",
    "google_gemini_api_changelog",
    "google_deepmind_news",
    "google_ai_blog",
    "cursor_changelog",
    "arxiv_cs_cv",
    "github_copilot_whats_new",
    "lmarena",
    "claude_code_changelog",
    "hugging_face_papers",
    "openreview",
    "acl_anthology",
    "cvf_open_access",
    "pmlr",
    "neurips_proceedings",
    "midjourney_updates",
    "ideogram_blog",
    "leonardo_ai_news",
    "black_forest_labs_announcements",
    "artificial_analysis_text_to_video",
    "adobe_news",
    "nvidia_research",
    "seedance_ai"
  ]);
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
  const records = await collectAdapterRecords({
    sources: [sourcePool.sources[0], sourcePool.sources[3]]
  }, {
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

test("collectGitHubMarkdownRecords extracts dated changelog entries from raw markdown", async () => {
  let fetchedUrl = "";
  const records = await collectGitHubMarkdownRecords(sourceById("claude_code_changelog"), {
    fetchImpl: async (url) => {
      fetchedUrl = String(url);
      return new Response(`
# Claude Code Changelog

## 1.0.90 - 2026-06-14
- Added model selection support for Claude Code agents.
- Improved tool permission prompts.

## 1.0.89 - 2026-06-11
- Fixed terminal rendering issue.
      `, { status: 200, headers: { "content-type": "text/plain" } });
    },
    limit: 2
  });

  assert.equal(
    fetchedUrl,
    "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md"
  );
  assert.equal(records.length, 2);
  assert.equal(records[0].sourcePoolId, "claude_code_changelog");
  assert.equal(records[0].publishedAt, "2026-06-14T12:00:00.000Z");
  assert.equal(records[0].originalUrl, "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#1090-2026-06-14");
  assert.match(records[0].title, /Claude Code Changelog/);
  assert.match(records[0].summary, /model selection support/);
});

test("collectGitHubMarkdownRecords uses latest file commit date for undated changelog headings", async () => {
  const fetchedUrls = [];
  const records = await collectGitHubMarkdownRecords(sourceById("claude_code_changelog"), {
    fetchImpl: async (url) => {
      fetchedUrls.push(String(url));
      if (String(url).includes("/commits?")) {
        return Response.json([
          {
            commit: {
              committer: {
                date: "2026-07-06T18:30:00Z"
              }
            }
          }
        ]);
      }
      return new Response(`
# Changelog

## 2.1.202
- Added dynamic workflow size support for Claude Code agents.
- Fixed remote control sessions for mobile and web.

## 2.1.201
- Fixed smaller CLI issues.
      `, { status: 200, headers: { "content-type": "text/plain" } });
    },
    limit: 3
  });

  assert.deepEqual(fetchedUrls, [
    "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md",
    "https://api.github.com/repos/anthropics/claude-code/commits?path=CHANGELOG.md&per_page=1"
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].publishedAt, "2026-07-06T18:30:00.000Z");
  assert.equal(records[0].title, "Claude Code Changelog: 2.1.202");
  assert.match(records[0].summary, /dynamic workflow size/);
});

test("collectOfficialFeedRecords uses known official RSS endpoints for blocked or redirected news pages", async () => {
  const fetchedUrls = [];
  const records = await collectOfficialFeedRecords(sourceById("openai_news"), {
    fetchImpl: async (url) => {
      fetchedUrls.push(String(url));
      return new Response(`
        <rss><channel>
          <item>
            <title>OpenAI launches new image generation model for developers</title>
            <link>https://openai.com/index/new-image-model/</link>
            <pubDate>Tue, 07 Jul 2026 16:00:00 GMT</pubDate>
            <description>OpenAI released an image generation model and API workflow update.</description>
            <media:content url="https://images.openai.com/image-model.jpg" medium="image" />
          </item>
        </channel></rss>
      `, { status: 200, headers: { "content-type": "application/rss+xml" } });
    },
    limit: 5
  });

  assert.deepEqual(fetchedUrls, ["https://openai.com/news/rss.xml"]);
  assert.equal(records.length, 1);
  assert.equal(records[0].sourcePoolId, "openai_news");
  assert.equal(records[0].originalUrl, "https://openai.com/index/new-image-model/");
  assert.equal(records[0].imageUrl, "https://images.openai.com/image-model.jpg");
});

test("collectOfficialFeedRecords parses CDATA RSS entries for ChatGPT and Codex news", async () => {
  const records = await collectOfficialFeedRecords(sourceById("openai_news"), {
    fetchImpl: async () => new Response(`
      <rss><channel>
        <item>
          <title><![CDATA[Australian Payments Plus moves faster with ChatGPT and Codex]]></title>
          <link><![CDATA[https://openai.com/index/australian-payments-plus]]></link>
          <pubDate><![CDATA[Tue, 07 Jul 2026 00:00:00 GMT]]></pubDate>
          <description><![CDATA[See how Australian Payments Plus uses ChatGPT Enterprise and Codex to move faster through payments complexity.]]></description>
        </item>
      </channel></rss>
    `, { status: 200, headers: { "content-type": "application/rss+xml" } }),
    limit: 5
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].sourcePoolId, "openai_news");
  assert.equal(records[0].title, "Australian Payments Plus moves faster with ChatGPT and Codex");
});

test("collectOfficialFeedRecords maps Google AI and DeepMind sources to their RSS endpoints", async () => {
  const fetchedUrls = [];
  const fetchImpl = async (url) => {
    fetchedUrls.push(String(url));
    return new Response(`
      <rss><channel>
        <item>
          <title>Google updates Gemini video and image generation research</title>
          <link>https://blog.google/technology/ai/gemini-visual-update/</link>
          <pubDate>Mon, 06 Jul 2026 12:00:00 GMT</pubDate>
          <description>Google shared a Gemini AI model update for visual generation.</description>
        </item>
      </channel></rss>
    `, { status: 200, headers: { "content-type": "application/rss+xml" } });
  };

  const googleRecords = await collectOfficialFeedRecords(sourceById("google_ai_blog"), { fetchImpl, limit: 5 });
  const deepmindRecords = await collectOfficialFeedRecords(sourceById("google_deepmind_news"), { fetchImpl, limit: 5 });

  assert.deepEqual(fetchedUrls, [
    "https://blog.google/technology/ai/rss/",
    "https://deepmind.google/blog/rss.xml"
  ]);
  assert.equal(googleRecords[0].sourcePoolId, "google_ai_blog");
  assert.equal(deepmindRecords[0].sourcePoolId, "google_deepmind_news");
});

test("collectHuggingFacePaperRecords extracts trending papers from hydrated page data", async () => {
  const dailyPapers = [
    {
      paper: {
        id: "2606.23050",
        title: "Agentic Image Editing with Vision Language Models",
        summary: "This paper introduces an agentic workflow for image editing with multimodal models.",
        publishedAt: "2026-06-30T09:30:00.000Z"
      },
      thumbnail: "https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/2606.23050.png"
    },
    {
      paper: {
        id: "2509.22186",
        title: "A Survey of Video Generation Models",
        summary: "A survey covering diffusion and transformer video generation model progress.",
        publishedAt: "2025-09-30T12:00:00.000Z"
      },
      thumbnail: "https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/2509.22186.png"
    }
  ];
  const props = JSON.stringify({ canSubmit: false, dailyPapers }).replaceAll("\"", "&quot;");
  const records = await collectHuggingFacePaperRecords(sourceById("hugging_face_papers"), {
    fetchImpl: async () => new Response(
      `<div class="SVELTE_HYDRATER contents" data-target="DailyPapers" data-props="${props}"></div>`,
      { status: 200, headers: { "content-type": "text/html" } }
    ),
    limit: 5
  });

  assert.equal(records.length, 2);
  assert.equal(records[0].sourcePoolId, "hugging_face_papers");
  assert.equal(records[0].title, "Agentic Image Editing with Vision Language Models");
  assert.equal(records[0].originalUrl, "https://huggingface.co/papers/2606.23050");
  assert.equal(records[0].publishedAt, "2026-06-30T09:30:00.000Z");
  assert.equal(records[0].imageUrl, "https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/2606.23050.png");
});

test("collectHuggingFacePaperRecords keeps LLM and agent research paper titles", async () => {
  const dailyPapers = [
    {
      paper: {
        id: "2412.20138",
        title: "TradingAgents: Multi-Agents LLM Financial Trading Framework",
        summary: "A multi-agent framework powered by large language models for financial trading.",
        publishedAt: "2024-12-28T12:54:06.000Z"
      }
    }
  ];
  const props = JSON.stringify({ dailyPapers }).replaceAll("\"", "&quot;");
  const records = await collectHuggingFacePaperRecords(sourceById("hugging_face_papers"), {
    fetchImpl: async () => new Response(
      `<div class="SVELTE_HYDRATER contents" data-target="DailyPapers" data-props="${props}"></div>`,
      { status: 200, headers: { "content-type": "text/html" } }
    ),
    limit: 5
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].title, "TradingAgents: Multi-Agents LLM Financial Trading Framework");
});

test("collectHuggingFacePaperRecords parses hydrated data containing apostrophes", async () => {
  const dailyPapers = [
    {
      paper: {
        id: "2412.20138",
        title: "TradingAgents: Multi-Agents LLM Financial Trading Framework",
        summary: "This paper studies multi-agent systems' potential for finance.",
        publishedAt: "2024-12-28T12:54:06.000Z"
      }
    }
  ];
  const props = JSON.stringify({ dailyPapers }).replaceAll("\"", "&quot;");
  const records = await collectHuggingFacePaperRecords(sourceById("hugging_face_papers"), {
    fetchImpl: async () => new Response(
      `<div class="SVELTE_HYDRATER contents" data-target="DailyPapers" data-props="${props}"></div>`,
      { status: 200, headers: { "content-type": "text/html" } }
    ),
    limit: 5
  });

  assert.equal(records.length, 1);
  assert.match(records[0].summary, /systems' potential/);
});

test("extractPaperIndexRecords extracts scholarly JSON-LD and proceedings links", () => {
  const records = extractPaperIndexRecords(`
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "ScholarlyArticle",
          "name": "Video Language Models Learn Temporal Reasoning",
          "abstract": "We introduce a benchmark for video language model temporal reasoning.",
          "datePublished": "2026-06-17",
          "url": "/content/CVPR2026/html/video-temporal-reasoning.html"
        }
        </script>
      </head>
      <body>
        <a href="/2026.acl-long.42/">Agentic Retrieval for Multimodal LLMs</a>
        <p>ACL 2026 paper on agentic retrieval and multimodal model evaluation.</p>
        <a href="/about">About the anthology</a>
      </body>
    </html>
  `, sourceById("cvf_open_access"), { limit: 5, pageURL: "https://aclanthology.org/" });

  assert.equal(records.length, 2);
  assert.equal(records[0].sourcePoolId, "cvf_open_access");
  assert.equal(records[0].fallbackCategory, "image_ai");
  assert.equal(records[0].title, "Video Language Models Learn Temporal Reasoning");
  assert.equal(records[0].publishedAt, "2026-06-17T00:00:00.000Z");
  assert.equal(records[1].originalUrl, "https://aclanthology.org/2026.acl-long.42/");
  assert.equal(records[1].publishedAt, "2026-01-01T12:00:00.000Z");
});

test("collectPaperIndexRecords fetches and extracts paper index records", async () => {
  const records = await collectPaperIndexRecords(sourceById("neurips_proceedings"), {
    fetchImpl: async () => new Response(`
      <a href="/paper_files/paper/2026/hash/model-routing-for-efficient-llm-inference-Abstract.html">
        Model Routing for Efficient LLM Inference
      </a>
      <p>NeurIPS 2026 paper on model routing, inference, and deployment.</p>
    `, { status: 200, headers: { "content-type": "text/html" } }),
    limit: 5
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].sourcePoolId, "neurips_proceedings");
  assert.equal(records[0].originalUrl, "https://papers.nips.cc/paper_files/paper/2026/hash/model-routing-for-efficient-llm-inference-Abstract.html");
  assert.equal(records[0].publishedAt, "2026-01-01T12:00:00.000Z");
});

test("collectPaperIndexRecords follows a discovered proceedings index page", async () => {
  const fetchedUrls = [];
  const records = await collectPaperIndexRecords(sourceById("pmlr"), {
    fetchImpl: async (url) => {
      fetchedUrls.push(String(url));
      if (String(url).endsWith("/v336")) {
        return new Response(`
          <div class="paper">
            <p class="title">Foundation Models for Scientific Discovery</p>
            <p class="details"><span class="info">Proceedings of COLT 2026</span></p>
            <p class="links">[<a href="https://proceedings.mlr.press/v336/science26a.html">abs</a>]</p>
          </div>
        `, { status: 200, headers: { "content-type": "text/html" } });
      }
      return new Response(`
        <ul class="proceedings-list">
          <li><a href="v336"><b>Volume 336</b></a> Proceedings of COLT 2026</li>
        </ul>
      `, { status: 200, headers: { "content-type": "text/html" } });
    },
    limit: 5
  });

  assert.deepEqual(fetchedUrls, [
    "https://proceedings.mlr.press/",
    "https://proceedings.mlr.press/v336"
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].title, "Foundation Models for Scientific Discovery");
  assert.equal(records[0].originalUrl, "https://proceedings.mlr.press/v336/science26a.html");
  assert.equal(records[0].publishedAt, "2026-01-01T12:00:00.000Z");
});

test("extractPaperIndexRecords handles ACL Anthology paper links", () => {
  const records = extractPaperIndexRecords(`
    <span class=d-block>
      <strong>
        <a class=align-middle href=/2025.ijcnlp-long.4/>
          Emotional Stereotypes in LLM Role-Playing Agents
        </a>
      </strong>
      <br>
      <div class="card-body p-3 small">
        We examine whether large language models exhibit emotional stereotypes when assigned nationality-specific personas.
      </div>
    </span>
  `, sourceById("acl_anthology"), { limit: 5, pageURL: "https://aclanthology.org/events/aacl-2025/" });

  assert.equal(records.length, 1);
  assert.equal(records[0].sourcePoolId, "acl_anthology");
  assert.equal(records[0].publishedAt, "2025-01-01T12:00:00.000Z");
  assert.equal(records[0].originalUrl, "https://aclanthology.org/2025.ijcnlp-long.4/");
});

test("extractPaperIndexRecords keeps CVF vision paper titles", () => {
  const records = extractPaperIndexRecords(`
    <dt class="ptitle">
      <a href="/content/CVPR2026/html/Xiao_Generalizable_Structure-Aware_Keypoint_Correspondence_for_Category-Unified_3D_Single_Object_Tracking_CVPR_2026_paper.html">
        Generalizable Structure-Aware Keypoint Correspondence for Category-Unified 3D Single Object Tracking
      </a>
    </dt>
  `, sourceById("cvf_open_access"), { limit: 5, pageURL: "https://openaccess.thecvf.com/CVPR2026?day=all" });

  assert.equal(records.length, 1);
  assert.equal(records[0].sourcePoolId, "cvf_open_access");
  assert.equal(records[0].publishedAt, "2026-01-01T12:00:00.000Z");
});

test("extractArxivListRecords extracts cs.CV new paper entries", () => {
  const records = extractArxivListRecords(`
    <h3>New submissions for Tue, 7 Jul 2026</h3>
    <dl>
      <dt><a title="Abstract" href="/abs/2607.12345">arXiv:2607.12345</a></dt>
      <dd>
        <div class="list-title mathjax">Title: Controllable Video Generation with Multimodal Diffusion Models</div>
        <p class="mathjax">We introduce a controllable video generation model for image and text prompts.</p>
      </dd>
      <dt><a title="Abstract" href="/abs/2607.22222">arXiv:2607.22222</a></dt>
      <dd>
        <div class="list-title mathjax">Title: Efficient 3D Scene Reconstruction for Vision Agents</div>
        <p class="mathjax">This paper studies 3D vision agents and reconstruction systems.</p>
      </dd>
    </dl>
  `, sourceById("arxiv_cs_cv"), { limit: 5, pageURL: "https://arxiv.org/list/cs.CV/new" });

  assert.equal(records.length, 2);
  assert.equal(records[0].sourcePoolId, "arxiv_cs_cv");
  assert.equal(records[0].fallbackCategory, "image_ai");
  assert.equal(records[0].originalUrl, "https://arxiv.org/abs/2607.12345");
  assert.equal(records[0].publishedAt, "2026-07-07T12:00:00.000Z");
  assert.match(records[0].summary, /controllable video generation/);
});

test("extractArxivListRecords handles real arXiv attribute order and listing date heading", () => {
  const records = extractArxivListRecords(`
    <h3>Showing new listings for Tuesday, 7 July 2026</h3>
    <dl>
      <dt>
        <a name='item1'>[1]</a>
        <a href="/abs/2607.02549" title="Abstract" id="2607.02549">arXiv:2607.02549</a>
      </dt>
      <dd>
        <div class='meta'>
          <div class='list-title mathjax'><span class='descriptor'>Title:</span> Learning 3D Affordances for Blade Insertion in Cluttered Stowing</div>
          <p class='mathjax'>Many manipulation tasks require reasoning about free-space affordances for robotics and vision systems.</p>
        </div>
      </dd>
    </dl>
  `, sourceById("arxiv_cs_cv"), { limit: 5, pageURL: "https://arxiv.org/list/cs.CV/new" });

  assert.equal(records.length, 1);
  assert.equal(records[0].originalUrl, "https://arxiv.org/abs/2607.02549");
  assert.equal(records[0].publishedAt, "2026-07-07T12:00:00.000Z");
});

test("extractVisualIndexRecords extracts dated image and video update cards", () => {
  const records = extractVisualIndexRecords(`
    <section>
      <article class="post-card">
        <a href="/news/phoenix-image-model/">
          <img src="/assets/phoenix.jpg" alt="Phoenix image model">
          <time datetime="2026-07-03T15:00:00Z">July 3, 2026</time>
          <h2>Phoenix image model brings controllable AI image generation to designers</h2>
          <p>New image generation and editing workflows for creative teams.</p>
        </a>
      </article>
      <div class="update-card">
        <a href="/blog/video-foundation-model">Video foundation model improves AI scene consistency</a>
        <span>Jul 2, 2026</span>
        <img data-src="https://cdn.example.com/video-model.jpg">
        <p>Video generation benchmark results improve temporal quality and prompt following.</p>
      </div>
    </section>
  `, sourceById("ideogram_blog"), { limit: 5 });

  assert.equal(records.length, 2);
  assert.equal(records[0].sourcePoolId, "ideogram_blog");
  assert.equal(records[0].fallbackCategory, "image_ai");
  assert.equal(records[0].title, "Phoenix image model brings controllable AI image generation to designers");
  assert.equal(records[0].originalUrl, "https://docs.ideogram.ai/news/phoenix-image-model/");
  assert.equal(records[0].publishedAt, "2026-07-03T15:00:00.000Z");
  assert.equal(records[0].imageUrl, "https://docs.ideogram.ai/assets/phoenix.jpg");
  assert.equal(records[1].imageUrl, "https://cdn.example.com/video-model.jpg");
});

test("collectVisualIndexRecords fetches visual source update pages", async () => {
  const records = await collectVisualIndexRecords(sourceById("black_forest_labs_announcements"), {
    fetchImpl: async () => new Response(`
      <article>
        <h3><a href="/announcements/flux-video/">FLUX Video model update expands AI video generation</a></h3>
        <time datetime="2026-07-04">July 4, 2026</time>
        <img src="/images/flux-video.png">
        <p>Black Forest Labs introduces an image-to-video model update for creative production.</p>
      </article>
    `, { status: 200, headers: { "content-type": "text/html" } }),
    limit: 5
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].sourcePoolId, "black_forest_labs_announcements");
  assert.equal(records[0].originalUrl, "https://blackforestlabs.ai/announcements/flux-video/");
  assert.equal(records[0].imageUrl, "https://blackforestlabs.ai/images/flux-video.png");
});

test("extractVisualIndexRecords handles Ghost and Squarespace visual indexes", () => {
  const records = extractVisualIndexRecords(`
    <article class="feed public post tag-announcement no-image">
      <div class="feed-calendar">
        <div class="feed-calendar-month">Jun</div>
        <div class="feed-calendar-day">25</div>
      </div>
      <h2 class="feed-title">V8.1 is now the default AI image model on Midjourney</h2>
      <a class="u-permalink" href="/v8-1-is-now-the-default-model/" aria-label="V8.1 is now the default model"></a>
    </article>
    <article class="hentry blog-item entry">
      <a href="/news-updates/stable-video-model-update" class="image-wrapper">
        <img data-src="https://images.example.com/stable-video.png">
      </a>
      <time class="blog-date">5/20/26</time>
      <h1 class="blog-title">
        <a href="/news-updates/stable-video-model-update">Stable Video model update improves AI generation quality</a>
      </h1>
      <div class="blog-excerpt"><p>Stability AI released a video generation model update for creative teams.</p></div>
    </article>
  `, sourceById("midjourney_updates"), { limit: 5, pageURL: "https://updates.midjourney.com/" });

  assert.equal(records.length, 2);
  assert.equal(records[0].publishedAt, "2026-06-25T12:00:00.000Z");
  assert.equal(records[0].originalUrl, "https://updates.midjourney.com/v8-1-is-now-the-default-model/");
  assert.equal(records[1].publishedAt, "2026-05-20T12:00:00.000Z");
  assert.equal(records[1].imageUrl, "https://images.example.com/stable-video.png");
});

test("collectVisualIndexRecords follows an alternate RSS feed when visual HTML has no records", async () => {
  const fetchedUrls = [];
  const records = await collectVisualIndexRecords(sourceById("ideogram_blog"), {
    fetchImpl: async (url) => {
      fetchedUrls.push(String(url));
      if (String(url).endsWith("/rss.xml")) {
        return new Response(`
          <rss><channel>
            <item>
              <title>Ideogram image model update adds AI canvas workflows</title>
              <link>https://docs.ideogram.ai/about-ideogram/blog-posts/canvas-workflows</link>
              <pubDate>Fri, 03 Jul 2026 15:00:00 GMT</pubDate>
              <description>Ideogram adds image generation and canvas editing workflows.</description>
              <media:content url="https://cdn.example.com/ideogram-canvas.png" medium="image" />
            </item>
          </channel></rss>
        `, { status: 200, headers: { "content-type": "application/rss+xml" } });
      }
      return new Response(`
        <html><head>
          <link rel="alternate" type="application/rss+xml" href="https://docs.ideogram.ai/about-ideogram/blog-posts/rss.xml">
        </head><body>No dated cards here.</body></html>
      `, { status: 200, headers: { "content-type": "text/html" } });
    },
    limit: 5
  });

  assert.deepEqual(fetchedUrls, [
    "https://docs.ideogram.ai/about-ideogram/blog-posts",
    "https://docs.ideogram.ai/about-ideogram/blog-posts/rss.xml"
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].title, "Ideogram image model update adds AI canvas workflows");
  assert.equal(records[0].imageUrl, "https://cdn.example.com/ideogram-canvas.png");
});

test("extractVisualIndexRecords ignores generic newsroom index titles", () => {
  const records = extractVisualIndexRecords(`
    <article>
      <h1>Adobe Newsroom</h1>
      <p>AI and creativity coverage from Adobe.</p>
      <a href="/news/2026/06/adobe-q2fy26-financial-results">Adobe Newsroom</a>
      <time>6/11/26</time>
    </article>
  `, sourceById("adobe_news"), { limit: 5, pageURL: "https://news.adobe.com/" });

  assert.equal(records.length, 0);
});

test("extractProductPageRecords extracts dated official image and video product pages", () => {
  const records = extractProductPageRecords(`
    <html>
      <head>
        <title>Seedance</title>
        <meta name="description" content="Seedance is a video generation model that supports multi-shot video from text and image prompts.">
        <meta name="twitter:image" content="https://lf3-static.bytednsdoc.com/obj/eden-cn/seedance/kv.jpeg">
      </head>
      <body>
        <h1>Seedance 2.0</h1>
        <p>A video generation model that supports text-to-video and image-to-video creation with cinematic motion.</p>
        <time datetime="2026-02-12">February 12, 2026</time>
      </body>
    </html>
  `, sourceById("seedance_ai"), { pageURL: "https://seed.bytedance.com/en/seedance" });

  assert.equal(records.length, 1);
  assert.equal(records[0].sourcePoolId, "seedance_ai");
  assert.equal(records[0].sourceName, "Seedance AI");
  assert.equal(records[0].title, "Seedance 2.0");
  assert.equal(records[0].publishedAt, "2026-02-12T00:00:00.000Z");
  assert.equal(records[0].imageUrl, "https://lf3-static.bytednsdoc.com/obj/eden-cn/seedance/kv.jpeg");
  assert.equal(records[0].fallbackCategory, "video_ai");
});

test("extractProductPageRecords ignores undated official product pages", () => {
  const records = extractProductPageRecords(`
    <html><body>
      <h1>Video AI product page</h1>
      <p>Generate videos and images with an AI model.</p>
    </body></html>
  `, sourceById("seedance_ai"));

  assert.equal(records.length, 0);
});

test("extractProductPageRecords uses descriptive product-page div text", () => {
  const records = extractProductPageRecords(`
    <html><body>
      <h1>Seedance 1.0</h1>
      <div class="description">
        A model that supports multi-shot video generation from both text and image prompts.
        It creates 1080p videos with smooth motion and cinematic aesthetics.
      </div>
      <span>2025-06-09</span>
      <img src="https://lf3-static.bytednsdoc.com/obj/eden-cn/seedance/cover.jpeg">
    </body></html>
  `, sourceById("seedance_ai"), { pageURL: "https://seed.bytedance.com/en/seedance" });

  assert.equal(records.length, 1);
  assert.equal(records[0].title, "Seedance 1.0");
  assert.match(records[0].summary, /multi-shot video generation/);
});

test("extractProductPageRecords accepts benchmark leaderboard product pages", () => {
  const records = extractProductPageRecords(`
    <html>
      <head>
        <title>Arena AI: The Official AI Ranking &amp; LLM Leaderboard</title>
        <meta name="description" content="Compare AI models across coding, image, video, and multimodal benchmark results.">
      </head>
      <body>
        <h1>Arena AI: The Official AI Ranking &amp; LLM Leaderboard</h1>
        <p>Community AI leaderboard for model rankings across coding, image, video, and multimodal tasks.</p>
        <span>2026-05-28</span>
      </body>
    </html>
  `, sourceById("lmarena"), { pageURL: "https://arena.ai/" });

  assert.equal(records.length, 1);
  assert.equal(records[0].sourcePoolId, "lmarena");
  assert.equal(records[0].sourceName, "LM Arena");
  assert.equal(records[0].publishedAt, "2026-05-28T00:00:00.000Z");
});

test("collectProductPageRecords uses canonical product page URLs when source-pool URLs point at mirrors", async () => {
  const fetchedUrls = [];
  const records = await collectProductPageRecords(sourceById("lmarena"), {
    fetchImpl: async (url) => {
      fetchedUrls.push(String(url));
      return new Response(`
        <html>
          <head>
            <title>Arena AI: The Official AI Ranking &amp; LLM Leaderboard</title>
            <meta name="description" content="Chat, compare, vote for the world's best AI models across LLMs, image, and code models.">
          </head>
          <body>
            <h1>Arena AI: The Official AI Ranking &amp; LLM Leaderboard</h1>
            <span>2026-05-28</span>
          </body>
        </html>
      `, { status: 200, headers: { "content-type": "text/html" } });
    },
    limit: 2
  });

  assert.deepEqual(fetchedUrls, ["https://arena.ai/"]);
  assert.equal(records.length, 1);
  assert.equal(records[0].originalUrl, "https://arena.ai/");
});

test("collectProductPageRecords fetches a dated official product page", async () => {
  const records = await collectProductPageRecords(sourceById("seedance_ai"), {
    fetchImpl: async () => new Response(`
      <h1>Seedance 2.0 Official Launch</h1>
      <p>ByteDance Seed released a video generation model for text and image to video workflows.</p>
      <span>2026-02-12</span>
      <img src="/assets/seedance-launch.jpeg">
    `, { status: 200, headers: { "content-type": "text/html" } }),
    limit: 2
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].originalUrl, "https://seed.bytedance.com/en/seedance");
  assert.equal(records[0].title, "Seedance 2.0 Official Launch");
  assert.equal(records[0].imageUrl, "https://seed.bytedance.com/assets/seedance-launch.jpeg");
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
