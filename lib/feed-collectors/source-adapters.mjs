const adapterSourceIds = new Set([
  "github_copilot_whats_new",
  "openai_news",
  "openai_api_changelog",
  "openai_model_release_notes",
  "claude_platform_release_notes",
  "claude_release_notes",
  "google_gemini_api_changelog",
  "google_deepmind_news",
  "google_ai_blog",
  "cursor_changelog",
  "openai_sora",
  "claude_code_changelog",
  "hugging_face_papers",
  "openreview",
  "arxiv_cs_cv",
  "acl_anthology",
  "cvf_open_access",
  "pmlr",
  "neurips_proceedings",
  "adobe_news",
  "adobe_firefly_runway",
  "black_forest_labs_announcements",
  "artificial_analysis_text_to_image",
  "artificial_analysis_text_to_video",
  "artificial_analysis_image_to_video",
  "vbench",
  "lmarena",
  "qwen_blog",
  "bytedance_seed",
  "seedance_ai",
  "minimax_news",
  "stability_ai_news",
  "midjourney_updates",
  "ideogram_blog",
  "leonardo_ai_news",
  "canva_newsroom_ai",
  "anthropic_research",
  "meta_ai_blog",
  "apple_ml_research",
  "microsoft_research_ai",
  "together_ai_blog",
  "replicate_blog",
  "fireworks_ai_blog",
  "groq_blog",
  "cerebras_blog",
  "xai_news",
  "perplexity_blog",
  "runway_research",
  "luma_news",
  "pika_faq",
  "kling_ai",
  "hailuo_ai_minimax",
  "nvidia_research",
  "tencent_hunyuan",
  "baidu_research_blog",
  "zhipu_ai",
  "moonshot_ai",
  "figma_ai",
  "notion_ai",
  "zapier_ai",
  "linear_changelog"
]);

const paperIndexSourceIds = new Set([
  "openreview",
  "acl_anthology",
  "cvf_open_access",
  "pmlr",
  "neurips_proceedings"
]);
const arxivListSourceIds = new Set([
  "arxiv_cs_cv"
]);
const officialFeedSourceURLs = new Map([
  ["openai_news", "https://openai.com/news/rss.xml"],
  ["google_deepmind_news", "https://deepmind.google/blog/rss.xml"],
  ["google_ai_blog", "https://blog.google/technology/ai/rss/"]
]);
const visualIndexSourceIds = new Set([
  "adobe_news",
  "black_forest_labs_announcements",
  "artificial_analysis_text_to_image",
  "artificial_analysis_text_to_video",
  "artificial_analysis_image_to_video",
  "stability_ai_news",
  "midjourney_updates",
  "ideogram_blog",
  "leonardo_ai_news",
  "canva_newsroom_ai",
  "runway_research",
  "luma_news",
  "kling_ai",
  "hailuo_ai_minimax",
  "nvidia_research"
]);
const productPageSourceIds = new Set([
  "openai_sora",
  "adobe_firefly_runway",
  "pika_faq",
  "vbench",
  "lmarena",
  "seedance_ai"
]);
const productPageSourceURLs = new Map([
  ["lmarena", "https://arena.ai/"]
]);
const collectableTiers = new Set(["S", "A"]);
const articleTypes = new Set(["article", "blogposting", "newsarticle", "techarticle", "report"]);
const paperTypes = new Set(["scholarlyarticle", "chapter", "creativework"]);

export function getAdapterSources(sourcePool) {
  return (sourcePool.sources ?? []).filter((source) => (
    (adapterSourceIds.has(source.id) || source.access_method === "hub_api_or_html") &&
    collectableTiers.has(source.authority_tier) &&
    source.access_method !== "rss"
  ));
}

export async function collectAdapterRecords(sourcePool, options = {}) {
  const sources = getAdapterSources(sourcePool);
  const limitPerSource = Number(options.limitPerSource ?? 4);
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers = options.headers ?? {
    "user-agent": "AignalFeedBot/0.1 (+https://github.com/ZiboC/aignal-platform)",
    accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5",
    "accept-language": "en-US,en;q=0.9"
  };
  const records = [];

  for (const source of sources) {
    try {
      const sourceRecords = await collectAdapterSourceRecords(source, {
        fetchImpl,
        headers,
        limitPerSource,
        timeoutMs: options.timeoutMs
      });
      records.push(...sourceRecords);
      recordCollectionAttempt(options.diagnostics, {
        collector: "adapter",
        source,
        status: "ok",
        candidateCount: sourceRecords.length,
        url: source.url
      });
    } catch (error) {
      recordCollectionAttempt(options.diagnostics, {
        collector: "adapter",
        source,
        status: "error",
        candidateCount: 0,
        error: error.message,
        url: source.url
      });
      console.warn(`Skipping adapter ${source.name}: ${error.message}`);
    }
  }

  return records;
}

async function collectAdapterSourceRecords(source, { fetchImpl, headers, limitPerSource, timeoutMs }) {
  if (source.access_method === "github_raw_or_html") {
    return collectGitHubMarkdownRecords(source, { fetchImpl, headers, limit: limitPerSource });
  }
  if (source.id === "hugging_face_papers") {
    return collectHuggingFacePaperRecords(source, { fetchImpl, headers, limit: limitPerSource });
  }
  if (officialFeedSourceURLs.has(source.id)) {
    return collectOfficialFeedRecords(source, { fetchImpl, headers, limit: limitPerSource });
  }
  if (arxivListSourceIds.has(source.id)) {
    return collectArxivListRecords(source, { fetchImpl, headers, limit: limitPerSource });
  }
  if (paperIndexSourceIds.has(source.id)) {
    return collectPaperIndexRecords(source, { fetchImpl, headers, limit: limitPerSource });
  }
  if (productPageSourceIds.has(source.id)) {
    return collectProductPageRecords(source, { fetchImpl, headers, limit: limitPerSource });
  }
  if (visualIndexSourceIds.has(source.id)) {
    return collectVisualIndexRecords(source, { fetchImpl, headers, limit: limitPerSource });
  }
  if (source.access_method === "hub_api_or_html") {
    return collectHuggingFaceOrgRecords(source, { fetchImpl, headers, limit: limitPerSource });
  }

  const response = await fetchImpl(source.url, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(Number(timeoutMs ?? 9000))
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const html = await response.text();
  return extractHTMLIndexRecords(html, source, { limit: limitPerSource, pageURL: response.url || source.url });
}

function recordCollectionAttempt(diagnostics, { collector, source, status, candidateCount, error = null, url = null }) {
  if (!diagnostics?.attempts) return;
  diagnostics.attempts.push({
    collector,
    source_id: source.id ?? null,
    source_name: source.name,
    source_url: url ?? source.url ?? null,
    status,
    candidate_count: Number(candidateCount ?? 0),
    error
  });
}

export async function collectGitHubMarkdownRecords(source, options = {}) {
  const rawURL = githubRawURL(source.url);
  if (!rawURL) return [];
  const fetchImpl = options.fetchImpl ?? fetch;
  const limit = Number(options.limit ?? 4);
  const response = await fetchImpl(rawURL, {
    headers: options.headers,
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const markdown = await response.text();
  const datedRecords = extractMarkdownChangelogRecords(markdown, source).slice(0, limit);
  if (datedRecords.length > 0) return datedRecords;

  const fallbackPublishedAt = await latestGitHubFileCommitDate(source.url, { fetchImpl, headers: options.headers });
  if (!fallbackPublishedAt) return [];
  return extractMarkdownChangelogRecords(markdown, source, {
    fallbackPublishedAt,
    latestUndatedOnly: true
  }).slice(0, limit);
}

export async function collectHuggingFacePaperRecords(source, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const limit = Number(options.limit ?? 4);
  const response = await fetchImpl(source.url, {
    headers: options.headers,
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return extractHuggingFacePaperRecords(await response.text(), source).slice(0, limit);
}

export async function collectOfficialFeedRecords(source, options = {}) {
  const feedURL = officialFeedSourceURLs.get(source.id);
  if (!feedURL) return [];
  const fetchImpl = options.fetchImpl ?? fetch;
  const limit = Number(options.limit ?? 4);
  const response = await fetchImpl(feedURL, {
    headers: options.headers,
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return extractFeedRecords(await response.text(), source, {
    limit,
    pageURL: response.url || feedURL
  });
}

export async function collectArxivListRecords(source, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const limit = Number(options.limit ?? 4);
  const response = await fetchImpl(source.url, {
    headers: options.headers,
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return extractArxivListRecords(await response.text(), source, {
    limit,
    pageURL: response.url || source.url
  });
}

export async function collectPaperIndexRecords(source, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const limit = Number(options.limit ?? 4);
  const discoveryLimit = Number(options.discoveryLimit ?? 1);
  const response = await fetchImpl(source.url, {
    headers: options.headers,
    redirect: "follow"
  });
  if (!response.ok && source.id !== "cvf_open_access") throw new Error(`${response.status} ${response.statusText}`);
  const html = response.ok ? await response.text() : "";
  const pageURL = response.url || source.url;
  const rootRecords = extractPaperIndexRecords(html, source, {
    limit,
    pageURL
  });
  if (rootRecords.length > 0) return rootRecords;

  const discoveredURLs = [
    ...paperIndexSeedURLs(source),
    ...discoverPaperIndexURLs(html, source, pageURL)
  ].filter((url, index, urls) => url && url !== pageURL && urls.indexOf(url) === index);
  const records = [];
  for (const url of discoveredURLs.slice(0, discoveryLimit)) {
    const discovered = await fetchImpl(url, {
      headers: options.headers,
      redirect: "follow"
    });
    if (!discovered.ok) continue;
    records.push(...extractPaperIndexRecords(await discovered.text(), source, {
      limit,
      pageURL: discovered.url || url
    }));
    if (records.length >= limit) break;
  }
  return records.slice(0, limit);
}

export async function collectVisualIndexRecords(source, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const limit = Number(options.limit ?? 4);
  const response = await fetchImpl(source.url, {
    headers: options.headers,
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const html = await response.text();
  const pageURL = response.url || source.url;
  const records = extractVisualIndexRecords(html, source, {
    limit,
    pageURL
  });
  if (records.length > 0) return records;

  const feedURL = alternateFeedURL(html, pageURL);
  if (!feedURL) return [];
  const feedResponse = await fetchImpl(feedURL, {
    headers: options.headers,
    redirect: "follow"
  });
  if (!feedResponse.ok) return [];
  return extractFeedRecords(await feedResponse.text(), source, {
    limit,
    pageURL: feedResponse.url || feedURL
  });
}

export async function collectProductPageRecords(source, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const limit = Number(options.limit ?? 4);
  const pageURL = productPageSourceURLs.get(source.id) ?? source.url;
  const response = await fetchImpl(pageURL, {
    headers: options.headers,
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return extractProductPageRecords(await response.text(), source, {
    limit,
    pageURL: response.url || pageURL
  });
}

export async function collectHuggingFaceOrgRecords(source, options = {}) {
  const org = huggingFaceOrgSlug(source.url);
  if (!org) return [];
  const fetchImpl = options.fetchImpl ?? fetch;
  const limit = Number(options.limit ?? 4);
  const apiURL = `https://huggingface.co/api/models?author=${encodeURIComponent(org)}&sort=lastModified&direction=-1&limit=${limit}`;
  const response = await fetchImpl(apiURL, {
    headers: options.headers,
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return extractHuggingFaceOrgRecords(await response.json(), source).slice(0, limit);
}

export function extractHuggingFaceOrgRecords(models, source) {
  return (Array.isArray(models) ? models : []).map((model) => {
    const modelId = String(model.id ?? model.modelId ?? "").trim();
    const publishedAt = parseDate(model.lastModified ?? model.createdAt ?? model.updatedAt);
    if (!modelId || !publishedAt) return null;
    const tags = Array.isArray(model.tags) ? model.tags.slice(0, 8).join(", ") : "";
    const metrics = [
      Number.isFinite(Number(model.downloads)) ? `${model.downloads} downloads` : null,
      Number.isFinite(Number(model.likes)) ? `${model.likes} likes` : null
    ].filter(Boolean).join(", ");
    return toRecord({
      title: `${modelId} updated on Hugging Face`,
      summary: [tags ? `Tags: ${tags}.` : "", metrics ? `Hub signals: ${metrics}.` : ""].filter(Boolean).join(" "),
      originalUrl: `https://huggingface.co/${modelId}`,
      publishedAt,
      imageUrl: null,
      source
    });
  }).filter(Boolean).filter(isUsefulRecord);
}

export function extractHuggingFacePaperRecords(html, source) {
  const props = extractHydratedProps(html, "DailyPapers");
  const papers = Array.isArray(props?.dailyPapers) ? props.dailyPapers : [];
  return papers.map((entry) => {
    const paper = entry?.paper ?? entry;
    const id = cleanText(paper?.id);
    const title = cleanText(entry?.title ?? paper?.title);
    const summary = cleanText(entry?.summary ?? paper?.summary ?? paper?.ai_summary);
    const publishedAt = parseDate(entry?.publishedAt ?? paper?.publishedAt);
    const imageUrl = isUsableImageURL(entry?.thumbnail) ? entry.thumbnail : null;
    if (!id || !title || !publishedAt) return null;
    return toRecord({
      title,
      summary: summary || title,
      originalUrl: `https://huggingface.co/papers/${id}`,
      publishedAt,
      imageUrl,
      source
    });
  }).filter(Boolean).filter(isUsefulRecord);
}

export function extractMarkdownChangelogRecords(markdown, source, options = {}) {
  const lines = String(markdown ?? "").split(/\r?\n/);
  const records = [];

  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index].match(/^#{2,3}\s+(.+?)\s*$/);
    if (!heading) continue;
    const headingText = cleanMarkdownText(heading[1]);
    const explicitPublishedAt = parseDate(markdownDate(headingText));
    const publishedAt = explicitPublishedAt ?? (
      options.latestUndatedOnly && records.length === 0
        ? parseDate(options.fallbackPublishedAt)
        : null
    );
    if (!headingText || !publishedAt) continue;
    const bullets = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (/^#{2,3}\s+/.test(lines[cursor])) break;
      const bullet = lines[cursor].match(/^\s*[-*]\s+(.+?)\s*$/);
      if (!bullet) continue;
      bullets.push(cleanMarkdownText(bullet[1]));
      if (bullets.length >= 3) break;
    }
    if (bullets.length === 0) continue;
    records.push(toRecord({
      title: `${source.name}: ${headingText}`,
      summary: bullets.join(" "),
      originalUrl: `${source.url}#${markdownAnchor(headingText)}`,
      publishedAt,
      imageUrl: null,
      source
    }));
  }

  return records.filter(isUsefulRecord);
}

export function extractPaperIndexRecords(html, source, { limit = 4, pageURL = source.url } = {}) {
  const records = [
    ...extractScholarlyJSONLDRecords(html, source, pageURL),
    ...extractPMLRPaperRecords(html, source, pageURL),
    ...extractPaperAnchorRecords(html, source, pageURL)
  ];
  const seen = new Set();
  const deduped = [];

  for (const record of records) {
    if (!isUsefulRecord(record)) continue;
    const key = normalizeKey(record.originalUrl ?? record.title);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(record);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

export function extractArxivListRecords(html, source, { limit = 4, pageURL = source.url } = {}) {
  const records = [];
  const pageDate = arxivListDate(html);
  const entries = [...String(html).matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)];

  for (const entry of entries) {
    const [, dt, dd] = entry;
    const abstractAnchor = dt.match(/<a\b(?=[^>]*title=["']Abstract["'])[^>]*>/i)?.[0] ?? "";
    const originalUrl = resolveURL(abstractAnchor.match(/\shref\s*=\s*["']([^"']+)["']/i)?.[1], pageURL);
    const title = cleanText(dd.match(/<div\b[^>]*class=["'][^"']*\blist-title\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]).replace(/^Title:\s*/i, "");
    if (!originalUrl || !title) continue;
    const summary = cleanText(dd.match(/<p\b[^>]*class=["'][^"']*\bmathjax\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? title);
    records.push(toRecord({
      title,
      summary,
      originalUrl,
      publishedAt: parseDate(pageDate ?? arxivIdDate(originalUrl)),
      imageUrl: null,
      source
    }));
    if (records.length >= limit) break;
  }

  return records.filter(isUsefulRecord);
}

export function extractVisualIndexRecords(html, source, { limit = 4, pageURL = source.url } = {}) {
  const records = [
    ...extractJSONLDRecords(html, source, pageURL),
    ...extractVisualCardRecords(html, source, pageURL)
  ];
  const seen = new Set();
  const deduped = [];

  for (const record of records) {
    if (!isUsefulRecord(record)) continue;
    const key = normalizeKey(record.originalUrl ?? record.title);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(record);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

export function extractProductPageRecords(html, source, { limit = 1, pageURL = source.url } = {}) {
  const publishedAt = parseDate(productPageDate(html));
  if (!publishedAt) return [];

  const title = productPageTitle(html);
  if (!title) return [];

  const summary = productPageSummary(html, title);
  const record = toRecord({
    title,
    summary,
    originalUrl: pageURL,
    publishedAt,
    imageUrl: extractHTMLMetadataImage(html, pageURL) ?? extractBlockImage(html, pageURL),
    source
  });

  return isUsefulRecord(record) ? [record].slice(0, limit) : [];
}

export function extractHTMLIndexRecords(html, source, { limit = 4, pageURL = source.url } = {}) {
  const records = [
    ...extractJSONLDRecords(html, source, pageURL),
    ...extractAnchorRecords(html, source, pageURL)
  ];
  const seen = new Set();
  const deduped = [];

  for (const record of records) {
    if (!isUsefulRecord(record)) continue;
    const key = normalizeKey(record.originalUrl ?? record.title);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(record);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

function extractJSONLDRecords(html, source, pageURL) {
  const records = [];
  const scripts = [...String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const script of scripts) {
    for (const node of flattenJSONLD(parseJSON(script[1]))) {
      const type = normalizeType(node?.["@type"]);
      if (!articleTypes.has(type)) continue;
      const title = cleanText(node.headline ?? node.name ?? node.title);
      const originalUrl = resolveURL(stringValue(node.url ?? node.mainEntityOfPage?.["@id"] ?? node.mainEntityOfPage), pageURL);
      if (!title || !originalUrl) continue;
      records.push(toRecord({
        title,
        summary: cleanText(node.description ?? node.abstract ?? title),
        originalUrl,
        publishedAt: parseDate(node.datePublished ?? node.dateModified ?? node.uploadDate),
        imageUrl: extractImage(node.image, pageURL),
        source
      }));
    }
  }

  return records;
}

function extractVisualCardRecords(html, source, pageURL) {
  const records = [];
  const anchorMatches = [...String(html).matchAll(anchorPattern())];
  const pageImage = extractHTMLMetadataImage(html, pageURL);

  for (const match of anchorMatches) {
    const originalUrl = resolveURL(anchorHref(match), pageURL);
    if (!originalUrl || samePageURL(originalUrl, pageURL)) continue;
    const block = visualBlockAround(html, match.index);
    const title = visualTitle(block, anchorBody(match));
    if (!title) continue;
    if (isGenericVisualTitle(title, source)) continue;
    const publishedAt = parseDate(extractNearbyDate(block, 0) ?? dateFromURL(originalUrl));
    const summary = visualSummary(block, title);
    const imageUrl = extractBlockImage(block, pageURL) ?? pageImage;
    records.push(toRecord({
      title,
      summary,
      originalUrl,
      publishedAt,
      imageUrl,
      source
    }));
  }

  return records;
}

function extractFeedRecords(xml, source, { limit = 4, pageURL = source.url } = {}) {
  const records = [];
  const items = [...String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  for (const item of items) {
    const block = item[1];
    const title = cleanText(tagText(block, "title"));
    const originalUrl = resolveURL(tagText(block, "link") || tagText(block, "guid"), pageURL);
    if (!title || !originalUrl) continue;
    records.push(toRecord({
      title,
      summary: cleanText(tagText(block, "description") || tagText(block, "content:encoded") || title),
      originalUrl,
      publishedAt: parseDate(tagText(block, "pubDate") || tagText(block, "dc:date")),
      imageUrl: extractFeedImage(block, pageURL),
      source
    }));
    if (records.length >= limit) break;
  }
  return records.filter(isUsefulRecord);
}

function alternateFeedURL(html, pageURL) {
  const match = String(html).match(/<link\b(?=[^>]*rel=["']alternate["'])(?=[^>]*type=["']application\/(?:rss|atom)\+xml["'])(?=[^>]*href=["']([^"']+)["'])[^>]*>/i);
  return resolveURL(match?.[1], pageURL);
}

function visualBlockAround(html, index) {
  const value = String(html ?? "");
  const tags = ["article", "li", "div", "section"];

  for (const tag of tags) {
    const start = value.lastIndexOf(`<${tag}`, index);
    if (start < 0 || index - start > 2500) continue;
    const close = value.indexOf(`</${tag}>`, index);
    if (close < 0) continue;
    const end = close + tag.length + 3;
    return value.slice(start, end);
  }

  return value.slice(Math.max(0, index - 800), index + 1600);
}

function visualTitle(block, anchorHTML) {
  const heading = String(block).match(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/i)?.[1];
  const title = cleanText(heading ?? anchorHTML);
  if (!title) return "";
  const sentence = title.split(/\s{2,}|\s[|•]\s/).find((part) => looksLikeSignalTitle(part)) ?? title;
  return cleanText(sentence);
}

function visualSummary(block, title) {
  const paragraphs = [...String(block).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => cleanText(match[1]))
    .filter((text) => text && text !== title);
  const summary = paragraphs.find((text) => looksLikeSignalTitle(text)) ?? paragraphs[0] ?? title;
  return summary.length > 260 ? `${summary.slice(0, 257).trim()}...` : summary;
}

function productPageTitle(html) {
  return cleanText(
    String(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ||
    metaContent(html, "property", "og:title") ||
    metaContent(html, "name", "twitter:title") ||
    String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  );
}

function productPageSummary(html, title) {
  const summary = cleanText(
    metaContent(html, "name", "description") ||
    metaContent(html, "property", "og:description") ||
    metaContent(html, "name", "twitter:description") ||
    String(html).match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ||
    productPageBodySummary(html, title) ||
    title
  );
  return summary.length > 320 ? `${summary.slice(0, 317).trim()}...` : summary;
}

function productPageBodySummary(html, title) {
  const descriptionBlock = String(html).match(/<[^>]+\bclass=["'][^"']*\bdescription\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article|p)>/i)?.[1];
  const text = cleanText(descriptionBlock || html).replace(title, "").trim();
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 35);
  const summary = sentences.find(looksLikeSignalTitle) ?? sentences[0] ?? "";
  return summary.length > 320 ? `${summary.slice(0, 317).trim()}...` : summary;
}

function productPageDate(html) {
  const value = String(html ?? "");
  return (
    metaContent(value, "property", "article:published_time") ||
    metaContent(value, "name", "date") ||
    metaContent(value, "name", "publishdate") ||
    value.match(/datetime=["']([^"']+)["']/i)?.[1] ||
    value.match(/\b(20\d{2}-\d{2}-\d{2})(?:[T ][0-2]\d:[0-5]\d(?::[0-5]\d)?Z?)?\b/)?.[0] ||
    value.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+20\d{2}\b/i)?.[0]
  );
}

function isGenericVisualTitle(title, source) {
  const normalized = cleanText(title).toLowerCase();
  const sourceName = cleanText(source.name).toLowerCase();
  return normalized === sourceName ||
    normalized === "adobe newsroom" ||
    normalized === "get all the latest adobe news." ||
    normalized === "blog posts" ||
    normalized === "research at nvidia" ||
    normalized === "news & updates";
}

function extractBlockImage(block, pageURL) {
  const imageTag = String(block).match(/<img\b[^>]*(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/i)?.[1];
  const sourceSet = String(block).match(/<source\b[^>]*srcset=["']([^"']+)["'][^>]*>/i)?.[1]?.split(/\s*,\s*/)[0]?.split(/\s+/)[0];
  const background = String(block).match(/background-image:\s*url\((["']?)([^"')]+)\1\)/i)?.[2];
  return [imageTag, sourceSet, background]
    .map((candidate) => resolveURL(candidate, pageURL))
    .find(isUsableImageURL) ?? null;
}

function extractFeedImage(block, pageURL) {
  const candidates = [
    attr(block, "media:content", "url", { typePrefix: "image/" }),
    attr(block, "media:thumbnail", "url"),
    attr(block, "enclosure", "url", { typePrefix: "image/" }),
    imageFromHTML(tagText(block, "description")),
    imageFromHTML(tagText(block, "content:encoded"))
  ];
  return candidates.map((candidate) => resolveURL(candidate, pageURL)).find(isUsableImageURL) ?? null;
}

function tagText(value, tagName) {
  const escaped = escapeRegExp(tagName);
  return cleanCDATA(decodeEntities(String(value).match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"))?.[1] ?? ""));
}

function attr(value, tagName, attrName, options = {}) {
  const tag = String(value).match(new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*\\s${escapeRegExp(attrName)}=["']([^"']+)["'][^>]*>`, "i"))?.[0];
  if (!tag) return "";
  const type = tag.match(/\stype=["']([^"']+)["']/i)?.[1] ?? "";
  const medium = tag.match(/\smedium=["']([^"']+)["']/i)?.[1] ?? "";
  if (options.typePrefix && !type.toLowerCase().startsWith(options.typePrefix) && medium.toLowerCase() !== "image") {
    return "";
  }
  return decodeEntities(tag.match(new RegExp(`\\s${escapeRegExp(attrName)}=["']([^"']+)["']`, "i"))?.[1] ?? "");
}

function imageFromHTML(value) {
  return decodeEntities(String(value).match(/<img\b[^>]*\ssrc=["']([^"']+)["'][^>]*>/i)?.[1] ?? "");
}

function extractPMLRPaperRecords(html, source, pageURL) {
  if (!String(pageURL).includes("proceedings.mlr.press")) return [];
  const records = [];
  const pageDate = dateFromText(html) ?? dateFromPaperURL(pageURL);
  const paperBlocks = [...String(html).matchAll(/<div\b[^>]*class=["'][^"']*\bpaper\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)];

  for (const block of paperBlocks) {
    const body = block[1];
    const title = cleanText(body.match(/<p\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]);
    const originalUrl = resolveURL(body.match(/<a\b[^>]*href=["']([^"']+\.html)["'][^>]*>\s*abs\s*<\/a>/i)?.[1], pageURL);
    if (!title || !originalUrl) continue;
    records.push(toRecord({
      title,
      summary: cleanText(body.match(/<p\b[^>]*class=["'][^"']*\bdetails\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? title),
      originalUrl,
      publishedAt: parseDate(dateFromPaperURL(originalUrl) ?? pageDate ?? dateFromText(body)),
      imageUrl: null,
      source
    }));
  }

  return records;
}

function extractScholarlyJSONLDRecords(html, source, pageURL) {
  const records = [];
  const scripts = [...String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const script of scripts) {
    for (const node of flattenJSONLD(parseJSON(script[1]))) {
      const type = normalizeType(node?.["@type"]);
      if (!paperTypes.has(type)) continue;
      const title = cleanText(node.headline ?? node.name ?? node.title);
      const originalUrl = resolveURL(stringValue(node.url ?? node.mainEntityOfPage?.["@id"] ?? node.mainEntityOfPage), pageURL);
      if (!title || !originalUrl) continue;
      records.push(toRecord({
        title,
        summary: cleanText(node.abstract ?? node.description ?? title),
        originalUrl,
        publishedAt: parseDate(node.datePublished ?? node.dateModified ?? dateFromPaperURL(originalUrl)),
        imageUrl: extractImage(node.image, pageURL),
        source
      }));
    }
  }

  return records;
}

function discoverPaperIndexURLs(html, source, pageURL) {
  const urls = [];
  const anchorMatches = [...String(html).matchAll(anchorPattern())];
  for (const match of anchorMatches) {
    const url = resolveURL(anchorHref(match), pageURL);
    const text = cleanText(`${anchorBody(match)} ${String(html).slice(match.index, match.index + 300)}`);
    if (!url || !looksLikePaperIndexURL(url, source, text)) continue;
    urls.push(url);
  }
  return urls;
}

function paperIndexSeedURLs(source) {
  if (source.id !== "cvf_open_access") return [];
  const year = new Date().getFullYear();
  return [
    `https://openaccess.thecvf.com/CVPR${year}?day=all`,
    `https://openaccess.thecvf.com/ICCV${year - 1}?day=all`,
    `https://openaccess.thecvf.com/WACV${year}?day=all`
  ];
}

function looksLikePaperIndexURL(url, source, text = "") {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (source.id === "openreview") {
      return parsed.hostname === "openreview.net" &&
        path === "/group" &&
        /\b(ICLR|ICML|NeurIPS|CVPR|ACL|EMNLP|NAACL|COLM)\b/i.test(`${url} ${text}`);
    }
    if (source.id === "acl_anthology") {
      return parsed.hostname === "aclanthology.org" && /^\/events\/[^/]*20\d{2}\/?$/i.test(path);
    }
    if (source.id === "cvf_open_access") {
      return parsed.hostname === "openaccess.thecvf.com" && /^\/(?:CVPR|ICCV|ECCV|WACV)20\d{2}$/i.test(path);
    }
    if (source.id === "pmlr") {
      return parsed.hostname === "proceedings.mlr.press" && /^\/v\d+\/?$/i.test(path) && /\b20\d{2}\b/.test(text);
    }
    if (source.id === "neurips_proceedings") {
      return parsed.hostname === "papers.nips.cc" && /^\/paper_files\/paper\/20\d{2}\/?$/i.test(path);
    }
    return false;
  } catch {
    return false;
  }
}

function extractPaperAnchorRecords(html, source, pageURL) {
  const records = [];
  const anchorMatches = [...String(html).matchAll(anchorPattern())];

  for (const match of anchorMatches) {
    const originalUrl = resolveURL(anchorHref(match), pageURL);
    const title = cleanText(anchorBody(match));
    if (!title || !originalUrl || !looksLikePaperURL(originalUrl)) continue;
    records.push(toRecord({
      title,
      summary: nearbyPaperSnippet(html, match.index) || title,
      originalUrl,
      publishedAt: parseDate(extractNearbyDate(html, match.index) ?? dateFromPaperURL(originalUrl)),
      imageUrl: null,
      source
    }));
  }

  return records;
}

function arxivListDate(html) {
  const match = String(html ?? "").match(/(?:New submissions for\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+|Showing new listings for\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+)(\d{1,2})\s+([A-Z][a-z]{2,8})\s+(20\d{2})/i);
  if (!match) return null;
  const [, day, month, year] = match;
  const monthIndex = monthNumber(month);
  if (!monthIndex) return null;
  return `${year}-${String(monthIndex).padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00Z`;
}

function arxivIdDate(url) {
  const match = String(url ?? "").match(/\/abs\/(\d{2})(\d{2})\.\d+/);
  if (!match) return null;
  const year = `20${match[1]}`;
  const month = match[2];
  return `${year}-${month}-01T12:00:00Z`;
}

function extractAnchorRecords(html, source, pageURL) {
  const records = [];
  const pageImage = extractHTMLMetadataImage(html, pageURL);
  const anchorMatches = [...String(html).matchAll(anchorPattern())];

  for (const match of anchorMatches) {
    const originalUrl = resolveURL(anchorHref(match), pageURL);
    const title = cleanText(anchorBody(match));
    if (!title || !originalUrl) continue;
    if (!looksLikeArticleURL(originalUrl, source.url) && !looksLikeSignalTitle(title)) continue;
    records.push(toRecord({
      title,
      summary: title,
      originalUrl,
      publishedAt: parseDate(extractNearbyDate(html, match.index) ?? dateFromURL(originalUrl)),
      imageUrl: pageImage,
      source
    }));
  }

  return records;
}

function anchorPattern() {
  return /<a\b[^>]*href=(?:"([^"]+)"|'([^']+)'|([^>\s]+))[^>]*>([\s\S]*?)<\/a>/gi;
}

function anchorHref(match) {
  return match[1] ?? match[2] ?? match[3] ?? "";
}

function anchorBody(match) {
  return match[4] ?? "";
}

function toRecord({ title, summary, originalUrl, publishedAt, imageUrl, source }) {
  return {
    title,
    summary: summary || title,
    sourceName: source.name,
    sourceUrl: source.url,
    originalUrl,
    sourcePoolId: source.id ?? source.sourcePoolId ?? null,
    authorityTier: source.authority_tier ?? source.authorityTier ?? "C",
    sourceType: source.source_type ?? source.sourceType ?? null,
    imageUrl,
    imageSource: imageUrl ? "source" : null,
    publishedAt: publishedAt ?? null,
    fallbackCategory: source.category_ids?.[0] ?? source.category ?? "models_products"
  };
}

function flattenJSONLD(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  const flattened = [];
  for (const item of values) {
    if (!item || typeof item !== "object") continue;
    flattened.push(item);
    if (Array.isArray(item["@graph"])) flattened.push(...flattenJSONLD(item["@graph"]));
    if (Array.isArray(item.itemListElement)) {
      flattened.push(...flattenJSONLD(item.itemListElement.map((entry) => entry.item ?? entry)));
    }
  }
  return flattened;
}

function parseJSON(value) {
  try {
    return JSON.parse(decodeEntities(value).trim());
  } catch {
    return null;
  }
}

function extractHydratedProps(html, target) {
  const targetPattern = new RegExp(`<[^>]+data-target=["']${escapeRegExp(target)}["'][^>]*>`, "i");
  const targetTag = String(html ?? "").match(targetPattern)?.[0];
  const encoded = targetTag?.match(/\sdata-props=(["'])([\s\S]*?)\1/i)?.[2];
  if (!encoded) return null;
  return parseJSON(decodeEntities(encoded));
}

function extractImage(value, pageURL) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return null;
  const raw = typeof candidate === "string" ? candidate : candidate.url ?? candidate.contentUrl;
  const resolved = resolveURL(raw, pageURL);
  return isUsableImageURL(resolved) ? resolved : null;
}

function extractHTMLMetadataImage(html, pageURL) {
  const candidates = [
    metaContent(html, "property", "og:image"),
    metaContent(html, "property", "og:image:url"),
    metaContent(html, "name", "twitter:image")
  ];
  return candidates.map((candidate) => resolveURL(candidate, pageURL)).find(isUsableImageURL) ?? null;
}

function metaContent(html, attrName, attrValue) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\s${attrName}=["']${escapeRegExp(attrValue)}["'])(?=[^>]*\\scontent=["']([^"']+)["'])[^>]*>`, "i");
  return decodeEntities(String(html).match(pattern)?.[1] ?? "");
}

function extractNearbyDate(html, index) {
  const nearby = String(html).slice(index, index + 800);
  return (
    nearby.match(/datetime=["']([^"']+)["']/i)?.[1] ??
    nearby.match(/\b(20\d{2}-\d{2}-\d{2})(?:[T ][0-2]\d:[0-5]\d(?::[0-5]\d)?Z?)?\b/)?.[0] ??
    nearby.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+20\d{2}\b/i)?.[0] ??
    dateFromMonthDayBlock(nearby) ??
    dateFromShortUSDate(nearby)
  );
}

function dateFromMonthDayBlock(value) {
  const month = String(value).match(/class=["'][^"']*\b(?:feed-calendar-month|month)\b[^"']*["'][^>]*>\s*([A-Z][a-z]{2,8})\s*</i)?.[1];
  const day = String(value).match(/class=["'][^"']*\b(?:feed-calendar-day|day)\b[^"']*["'][^>]*>\s*(\d{1,2})\s*</i)?.[1];
  if (!month || !day) return null;
  const monthIndex = monthNumber(month);
  if (!monthIndex) return null;
  return `${new Date().getFullYear()}-${String(monthIndex).padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00Z`;
}

function monthNumber(value) {
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const index = months.indexOf(String(value ?? "").slice(0, 3).toLowerCase());
  return index >= 0 ? index + 1 : null;
}

function dateFromShortUSDate(value) {
  const match = String(value).match(/\b([01]?\d)\/([0-3]?\d)\/(\d{2,4})\b/);
  if (!match) return null;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}T12:00:00Z`;
}

function dateFromURL(url) {
  const match = String(url).match(/\/(20\d{2})[/-](\d{1,2})[/-](\d{1,2})(?:\/|$)/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}T12:00:00Z`;
}

function dateFromPaperURL(url) {
  const match = String(url).match(/(?:^|[^\d])(20\d{2})(?:[^\d]|$)/);
  return match ? `${match[1]}-01-01T12:00:00Z` : null;
}

function dateFromText(value) {
  const match = String(value ?? "").match(/\b(20\d{2})\b/);
  if (!match) return null;
  const year = Number(match[1]);
  const maxYear = new Date().getFullYear() + 1;
  if (year < 2000 || year > maxYear) return null;
  return `${match[1]}-01-01T12:00:00Z`;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function markdownDate(value) {
  const date = String(value ?? "").match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0] ?? null;
  return date ? `${date}T12:00:00Z` : null;
}

function markdownAnchor(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function cleanMarkdownText(value) {
  return decodeEntities(String(value ?? "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim());
}

function cleanCDATA(value) {
  return String(value ?? "")
    .replace(/^<!\[CDATA\[/i, "")
    .replace(/\]\]>$/i, "")
    .trim();
}

function githubRawURL(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const blobIndex = parts.indexOf("blob");
    if (parts.length < 5 || blobIndex !== 2) return null;
    const [owner, repo] = parts;
    const branch = parts[blobIndex + 1];
    const filePath = parts.slice(blobIndex + 2).join("/");
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  } catch {
    return null;
  }
}

async function latestGitHubFileCommitDate(value, options = {}) {
  const info = githubFileInfo(value);
  if (!info) return null;
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiURL = `https://api.github.com/repos/${info.owner}/${info.repo}/commits?path=${encodeURIComponent(info.filePath)}&per_page=1`;
  const response = await fetchImpl(apiURL, {
    headers: options.headers,
    redirect: "follow"
  });
  if (!response.ok) return null;
  const commits = await response.json();
  const date = Array.isArray(commits)
    ? commits[0]?.commit?.committer?.date ?? commits[0]?.commit?.author?.date
    : null;
  return parseDate(date);
}

function githubFileInfo(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const blobIndex = parts.indexOf("blob");
    if (parts.length < 5 || blobIndex !== 2) return null;
    const [owner, repo] = parts;
    const branch = parts[blobIndex + 1];
    const filePath = parts.slice(blobIndex + 2).join("/");
    return { owner, repo, branch, filePath };
  } catch {
    return null;
  }
}

function huggingFaceOrgSlug(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "huggingface.co") return null;
    return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
  } catch {
    return null;
  }
}

function looksLikeArticleURL(url, sourceURL) {
  try {
    const parsed = new URL(url);
    const source = new URL(sourceURL);
    if (parsed.hostname !== source.hostname) return false;
    return /\/(blog|news|research|changelog|updates?|articles?|posts?|release|releases|announcements?)\b/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function looksLikePaperURL(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    return (
      parsed.hostname === "openreview.net" && /^\/(?:forum|pdf)\b/i.test(path) ||
      parsed.hostname === "aclanthology.org" && /^\/20\d{2}\.[^/]+\/?$/i.test(path) ||
      parsed.hostname === "openaccess.thecvf.com" && /\/content\/[^/]+\/html\/.+\.html$/i.test(path) ||
      parsed.hostname === "proceedings.mlr.press" && /^\/v\d+\/[^/]+\.html$/i.test(path) ||
      parsed.hostname === "papers.nips.cc" && /\/(?:paper|paper_files\/paper)\/20\d{2}\//i.test(path)
    );
  } catch {
    return false;
  }
}

function looksLikeSignalTitle(title) {
  return /\b(ai|chatgpt|codex|llms?|models?|videos?|images?|agents?|research|release|launch|benchmarks?|developer|api|tools?|workflows?|inference|open source|multimodal|code|coding|cli|foundation|vision|tracking|detection|segmentation|reconstruction|diffusion|3d)\b/i.test(title);
}

function isUsefulRecord(record) {
  if (!record.title || record.title.length < 12 || record.title.length > 180) return false;
  if (!record.originalUrl) return false;
  if (
    record.originalUrl === record.sourceUrl?.replace(/[#?].*$/, "") &&
    !["official_product_page", "benchmark_suite", "benchmark_leaderboard"].includes(record.sourceType)
  ) {
    return false;
  }
  if (!record.publishedAt) return false;
  return looksLikeSignalTitle(`${record.title} ${record.summary}`);
}

function samePageURL(left, right) {
  return normalizeKey(left) === normalizeKey(right);
}

function normalizeType(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? "").toLowerCase();
}

function stringValue(value) {
  return typeof value === "string" ? value : null;
}

function cleanText(value) {
  return decodeEntities(String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function nearbyPaperSnippet(html, index) {
  const nearby = String(html).slice(index, index + 900).split(/<a\b/i)[0];
  const text = cleanText(nearby);
  return text.length > 260 ? `${text.slice(0, 257).trim()}...` : text;
}

function resolveURL(value, baseURL) {
  if (!value) return null;
  try {
    return new URL(value, baseURL).toString();
  } catch {
    return null;
  }
}

function isUsableImageURL(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    return !/\.(svg|gif)(\?|#|$)/i.test(url.pathname);
  } catch {
    return false;
  }
}

function normalizeKey(value) {
  return String(value ?? "").toLowerCase().replace(/[?#].*$/, "").replace(/\/$/, "");
}

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
