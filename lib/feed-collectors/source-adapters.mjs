const adapterSourceIds = new Set([
  "qwen_blog",
  "bytedance_seed",
  "minimax_news",
  "stability_ai_news",
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
  "kling_ai",
  "hailuo_ai_minimax",
  "tencent_hunyuan",
  "baidu_research_blog",
  "zhipu_ai",
  "moonshot_ai",
  "figma_ai",
  "notion_ai",
  "zapier_ai",
  "linear_changelog"
]);

const collectableTiers = new Set(["S", "A"]);
const articleTypes = new Set(["article", "blogposting", "newsarticle", "techarticle", "report"]);

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
      if (source.access_method === "hub_api_or_html") {
        records.push(...await collectHuggingFaceOrgRecords(source, { fetchImpl, headers, limit: limitPerSource }));
        continue;
      }
      const response = await fetchImpl(source.url, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(Number(options.timeoutMs ?? 9000))
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const html = await response.text();
      records.push(...extractHTMLIndexRecords(html, source, { limit: limitPerSource, pageURL: response.url || source.url }));
    } catch (error) {
      console.warn(`Skipping adapter ${source.name}: ${error.message}`);
    }
  }

  return records;
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

function extractAnchorRecords(html, source, pageURL) {
  const records = [];
  const pageImage = extractHTMLMetadataImage(html, pageURL);
  const anchorMatches = [...String(html).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];

  for (const match of anchorMatches) {
    const originalUrl = resolveURL(match[1], pageURL);
    const title = cleanText(match[2]);
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

function toRecord({ title, summary, originalUrl, publishedAt, imageUrl, source }) {
  return {
    title,
    summary: summary || title,
    sourceName: source.name,
    sourceUrl: source.url,
    originalUrl,
    sourcePoolId: source.id,
    authorityTier: source.authority_tier ?? "C",
    imageUrl,
    imageSource: imageUrl ? "source" : null,
    publishedAt: publishedAt ?? null,
    fallbackCategory: source.category_ids?.[0] ?? "models_products"
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
    nearby.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+20\d{2}\b/i)?.[0]
  );
}

function dateFromURL(url) {
  const match = String(url).match(/\/(20\d{2})[/-](\d{1,2})[/-](\d{1,2})(?:\/|$)/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}T12:00:00Z`;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
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

function looksLikeSignalTitle(title) {
  return /\b(ai|model|video|image|agent|research|release|launch|benchmark|developer|api|tool|workflow|inference|open source|multimodal)\b/i.test(title);
}

function isUsefulRecord(record) {
  if (!record.title || record.title.length < 12 || record.title.length > 180) return false;
  if (!record.originalUrl || record.originalUrl === record.sourceUrl?.replace(/[#?].*$/, "")) return false;
  if (!record.publishedAt) return false;
  return looksLikeSignalTitle(`${record.title} ${record.summary}`);
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
