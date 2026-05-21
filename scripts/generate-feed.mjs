import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const date = args.date ?? new Date().toISOString().slice(0, 10);
const outDir = args.out ?? "public";
const sampleMode = Boolean(args.sample);
const itemLimit = Number(args.limit ?? 15);
const openAIKey = process.env.OPENAI_API_KEY;
const publicBaseURL = process.env.PUBLIC_BASE_URL ?? inferPagesBaseURL();
const enableGeneratedImages = parseBoolean(process.env.ENABLE_OPENAI_IMAGES ?? args.generateImages ?? "false");
const generatedImageLimit = Number(process.env.OPENAI_IMAGE_LIMIT ?? args.imageLimit ?? 0);
let generatedImageCount = 0;
let openAITextDisabled = !openAIKey;
let openAIImageDisabled = !openAIKey || !enableGeneratedImages || generatedImageLimit <= 0;
const feedHeaders = {
  "user-agent": "AignalFeedBot/0.1 (+https://github.com/ZiboC/aignal-platform)",
  accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
};
const pageHeaders = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache"
};

const categories = [
  "coding_ai",
  "image_ai",
  "video_ai",
  "research_papers",
  "models_products",
  "business_investment",
  "tools_apps"
];

const sources = [
  { name: "OpenAI Blog", url: "https://openai.com/news/rss.xml", category: "models_products" },
  { name: "Google AI Blog", url: "https://blog.google/technology/ai/rss/", category: "models_products" },
  { name: "Anthropic News", url: "https://www.anthropic.com/news/rss.xml", category: "models_products" },
  { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", category: "tools_apps" },
  { name: "arXiv cs.AI", url: "https://export.arxiv.org/rss/cs.AI", category: "research_papers" },
  { name: "arXiv cs.CL", url: "https://export.arxiv.org/rss/cs.CL", category: "research_papers" }
];

const records = sampleMode ? sampleRecords(date) : await collectRecords();
const deduped = dedupe(records).slice(0, itemLimit);
const items = [];

for (const [index, record] of deduped.entries()) {
  const classified = classify(record);
  const enriched = openAITextDisabled
    ? heuristicEnrichment(record, classified.category)
    : await enrichSafely(record, classified.category);

  const id = stableId(`${date}-${record.originalUrl ?? record.sourceUrl ?? record.title}`);
  const imagePrompt = buildImagePrompt(enriched.titleEn, classified.category);
  let imageUrl = record.imageUrl ?? null;
  let imageSource = record.imageSource ?? (imageUrl ? "source" : null);

  if (!imageUrl) {
    imageUrl = await fetchSourcePageImage(record);
    if (imageUrl) imageSource = "source";
  }

  if (!imageUrl && !openAIImageDisabled && generatedImageCount < generatedImageLimit) {
    imageUrl = await generateImage({ id, date, prompt: imagePrompt, outDir });
    if (imageUrl) {
      imageSource = "generated";
      generatedImageCount += 1;
    }
  }

  items.push({
    id,
    category: classified.category,
    title_zh: enriched.titleZh,
    title_en: enriched.titleEn,
    summary_zh: enriched.summaryZh,
    summary_en: enriched.summaryEn,
    why_it_matters_zh: enriched.whyZh,
    why_it_matters_en: enriched.whyEn,
    source_name: record.sourceName,
    source_url: record.sourceUrl,
    original_url: record.originalUrl ?? record.sourceUrl,
    published_at: record.publishedAt,
    image_name: classified.category,
    image_url: imageUrl,
    image_source: imageSource,
    image_prompt: imagePrompt,
    confidence: enriched.confidence,
    tags: buildTags(classified.category, record.title).slice(0, 5)
  });

  if (items.length >= itemLimit) break;
  if (index < deduped.length - 1) await sleep(150);
}

const validItems = items.filter((item) => item.source_url || item.original_url);
if (validItems.length < 5) {
  throw new Error(`Only generated ${validItems.length} valid feed items; expected at least 5.`);
}

await publishFeed({ outDir, date, items: validItems });
logImageStats(validItems);
console.log(`Generated ${validItems.length} items for ${date}`);

async function enrichSafely(record, category) {
  try {
    return await enrichWithOpenAI(record, category);
  } catch (error) {
    openAITextDisabled = true;
    console.warn(`OpenAI text generation unavailable, using heuristic content: ${error.message}`);
    return heuristicEnrichment(record, category);
  }
}

async function collectRecords() {
  const collected = [];
  for (const source of sources) {
    try {
      const response = await fetch(source.url, {
        headers: feedHeaders
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const xml = await response.text();
      collected.push(...parseRSS(xml, source));
    } catch (error) {
      console.warn(`Skipping ${source.name}: ${error.message}`);
    }
  }
  return collected.length > 0 ? collected : sampleRecords(date);
}

function parseRSS(xml, source) {
  const itemBlocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  return itemBlocks.map((block) => {
    const title = cleanXML(pick(block, "title")) || "Untitled AI update";
    const link = cleanXML(pick(block, "link")) || attr(block, "link", "href");
    const rawSummary = pick(block, "description") || pick(block, "summary") || pick(block, "content") || pick(block, "content:encoded");
    const summary = cleanXML(rawSummary);
    const published = cleanXML(pick(block, "pubDate") || pick(block, "published") || pick(block, "updated"));
    const imageUrl = extractSourceImage(block, rawSummary);

    return {
      title,
      summary,
      sourceName: source.name,
      sourceUrl: link,
      originalUrl: link,
      imageUrl,
      imageSource: imageUrl ? "source" : null,
      publishedAt: published ? new Date(published).toISOString() : `${date}T08:00:00Z`,
      fallbackCategory: source.category
    };
  }).filter((item) => item.sourceUrl);
}

async function enrichWithOpenAI(record, category) {
  const prompt = {
    title: record.title,
    summary: record.summary,
    source: record.sourceName,
    category
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${openAIKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: "Return compact JSON only. Generate bilingual AI news feed copy. Do not invent facts beyond the source text."
        },
        {
          role: "user",
          content: JSON.stringify(prompt)
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "aignal_item",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              titleZh: { type: "string" },
              titleEn: { type: "string" },
              summaryZh: { type: "string" },
              summaryEn: { type: "string" },
              whyZh: { type: "string" },
              whyEn: { type: "string" },
              confidence: { type: "number" }
            },
            required: ["titleZh", "titleEn", "summaryZh", "summaryEn", "whyZh", "whyEn", "confidence"]
          }
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI text generation failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  const text = data.output_text ?? data.output?.flatMap((item) => item.content ?? []).find((part) => part.text)?.text;
  return JSON.parse(text);
}

async function generateImage({ id, date, prompt, outDir }) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${openAIKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
      prompt,
      size: "1024x1024"
    })
  });
  if (!response.ok) {
    const body = await response.text();
    openAIImageDisabled = true;
    console.warn(`Image generation failed for ${id}: ${response.status} ${body}`);
    return null;
  }
  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) return null;
  const imageDir = path.join(outDir, "images", date);
  await mkdir(imageDir, { recursive: true });
  const relativePath = `/images/${date}/${id}.png`;
  await writeFile(path.join(outDir, "images", date, `${id}.png`), Buffer.from(b64, "base64"));
  return publicBaseURL
    ? `${publicBaseURL.replace(/\/$/, "")}${relativePath}`
    : relativePath;
}

async function fetchSourcePageImage(record) {
  const url = record.originalUrl ?? record.sourceUrl;
  if (!url || /arxiv\.org\/(abs|pdf)\//i.test(url)) return null;
  for (const headers of [pageHeaders, feedHeaders]) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers,
        redirect: "follow"
      });
      clearTimeout(timeout);
      if (!response.ok) continue;
      const html = await response.text();
      const imageURL = extractHTMLMetadataImage(html, url);
      if (imageURL) return imageURL;
    } catch {
      continue;
    }
  }
  return null;
}

function logImageStats(items) {
  const withImages = items.filter((item) => item.image_url).length;
  const sourceImages = items.filter((item) => item.image_source === "source").length;
  const generatedImages = items.filter((item) => item.image_source === "generated").length;
  console.log(`Image stats: ${withImages}/${items.length} with image_url, ${sourceImages} source, ${generatedImages} generated`);
}

function extractSourceImage(block, rawSummary) {
  const candidates = [
    attr(block, "media:content", "url", { typePrefix: "image/" }),
    attr(block, "media:thumbnail", "url"),
    attr(block, "enclosure", "url", { typePrefix: "image/" }),
    attr(block, "image", "url"),
    imageFromHTML(rawSummary),
    imageFromHTML(block)
  ];
  return candidates.find(isUsableImageURL) ?? null;
}

function extractHTMLMetadataImage(html, pageURL) {
  const candidates = [
    metaContent(html, "property", "og:image"),
    metaContent(html, "property", "og:image:url"),
    metaContent(html, "name", "twitter:image"),
    metaContent(html, "name", "twitter:image:src"),
    imageFromHTML(html)
  ];
  const resolved = candidates
    .filter(Boolean)
    .map((candidate) => resolveURL(candidate, pageURL));
  return resolved.find(isUsableImageURL) ?? null;
}

function metaContent(html, attrName, attrValue) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\s${attrName}=["']${escapeRegExp(attrValue)}["'])(?=[^>]*\\scontent=["']([^"']+)["'])[^>]*>`, "i");
  return decodeEntities(html.match(pattern)?.[1] ?? "");
}

function resolveURL(value, baseURL) {
  try {
    return new URL(value, baseURL).toString();
  } catch {
    return value;
  }
}

function inferPagesBaseURL() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo || !repo.includes("/")) return null;
  const [owner, name] = repo.split("/");
  return `https://${owner.toLowerCase()}.github.io/${name}`;
}

async function publishFeed({ outDir, date, items }) {
  const dailyDir = path.join(outDir, "feed", "daily");
  await mkdir(dailyDir, { recursive: true });
  await writeJSON(path.join(outDir, "feed", "latest.json"), items);
  await writeJSON(path.join(dailyDir, `${date}.json`), items);

  const indexPath = path.join(outDir, "feed", "index.json");
  const previous = existsSync(indexPath)
    ? JSON.parse(await readFile(indexPath, "utf8"))
    : { dates: [] };
  const dates = [date, ...previous.dates.filter((item) => item !== date)].slice(0, 90);
  await writeJSON(indexPath, { dates });
}

function heuristicEnrichment(record, category) {
  const title = record.title.trim();
  const summary = firstSentence(record.summary || title, 220);
  return {
    titleZh: title,
    titleEn: title,
    summaryZh: summary,
    summaryEn: summary,
    whyZh: `这条动态属于 ${category}，值得关注其对 AI 产品、研发或产业应用的影响。`,
    whyEn: `This update is relevant to ${category} and may affect AI products, research, or industry adoption.`,
    confidence: 0.65
  };
}

function classify(record) {
  const text = `${record.title} ${record.summary}`.toLowerCase();
  if (/code|coding|developer|github|ide|test/.test(text)) return { category: "coding_ai" };
  if (/image|photo|design|visual/.test(text)) return { category: "image_ai" };
  if (/video|film|voice|audio/.test(text)) return { category: "video_ai" };
  if (/paper|research|arxiv|benchmark|eval/.test(text)) return { category: "research_papers" };
  if (/funding|investment|revenue|enterprise|business/.test(text)) return { category: "business_investment" };
  if (/tool|app|workflow|productivity/.test(text)) return { category: "tools_apps" };
  return { category: record.fallbackCategory && categories.includes(record.fallbackCategory) ? record.fallbackCategory : "models_products" };
}

function buildTags(category, title) {
  const base = category.split("_").filter(Boolean);
  if (/agent/i.test(title)) base.push("agents");
  if (/model/i.test(title)) base.push("models");
  if (/open source/i.test(title)) base.push("open-source");
  return [...new Set(base)];
}

function buildImagePrompt(title, category) {
  return `Modern editorial square illustration for an AI news app. Topic: ${title}. Category: ${category}. Clean, premium, technology-focused, no text, no logos.`;
}

function sampleRecords(date) {
  return categories.flatMap((category, index) => [
    {
      title: `Sample ${category.replaceAll("_", " ")} update ${index + 1}`,
      summary: `A representative AI update for ${category}, used to verify the feed pipeline and iOS decoding path.`,
      sourceName: "Aignal Sample Source",
      sourceUrl: `https://example.com/${category}/${index + 1}`,
      originalUrl: `https://example.com/${category}/${index + 1}`,
      imageUrl: null,
      publishedAt: `${date}T0${index % 9}:30:00Z`,
      fallbackCategory: category
    },
    {
      title: `Daily ${category.replaceAll("_", " ")} signal ${index + 1}`,
      summary: `A second representative item for ${category}, ensuring the generated feed reaches the target item count.`,
      sourceName: "Aignal Sample Source",
      sourceUrl: `https://example.com/${category}/daily-${index + 1}`,
      originalUrl: `https://example.com/${category}/daily-${index + 1}`,
      imageUrl: null,
      publishedAt: `${date}T1${index % 9}:15:00Z`,
      fallbackCategory: category
    }
  ]);
}

function dedupe(records) {
  const seen = new Set();
  return records.filter((record) => {
    const key = normalize(record.originalUrl || record.sourceUrl || record.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalize(value) {
  return String(value).toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pick(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ?? "";
}

function attr(block, tag, name, options = {}) {
  const tagMatch = block.match(new RegExp(`<${tag}\\b[^>]*>`, "i"));
  if (!tagMatch) return null;
  const tagText = tagMatch[0];
  if (options.typePrefix) {
    const type = tagText.match(/\stype=["']([^"']+)["']/i)?.[1] ?? "";
    if (!type.toLowerCase().startsWith(options.typePrefix)) return null;
  }
  return decodeEntities(tagText.match(new RegExp(`\\s${name}=["']([^"']+)["']`, "i"))?.[1] ?? "");
}

function imageFromHTML(value) {
  const html = String(value ?? "").replace(/<!\[CDATA\[|\]\]>/g, "");
  const imgMatch = html.match(/<img\b[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
  return imgMatch ? decodeEntities(imgMatch[1]) : null;
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

function cleanXML(value) {
  return decodeEntities(String(value)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function firstSentence(value, limit) {
  const clean = cleanXML(value);
  return clean.length <= limit ? clean : `${clean.slice(0, limit - 1).trim()}…`;
}

async function writeJSON(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function stableId(value) {
  let hash = 0x811c9dc5;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return `item-${(hash >>> 0).toString(16)}`;
}

function parseArgs(argv) {
  return Object.fromEntries(argv.map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? true];
  }));
}

function parseBoolean(value) {
  return /^(1|true|yes|on)$/i.test(String(value));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
