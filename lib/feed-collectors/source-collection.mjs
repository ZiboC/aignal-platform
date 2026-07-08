import { collectAdapterRecords, extractHTMLIndexRecords } from "./source-adapters.mjs";
import { getCollectableFeedSources } from "../feed-quality/source-selection.mjs";

const defaultFeedHeaders = {
  "user-agent": "AignalFeedBot/0.1 (+https://github.com/ZiboC/aignal-platform)",
  accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
};

export async function collectSourceRecords(sourcePool, options = {}) {
  const { records } = await collectSourceRecordsWithDiagnostics(sourcePool, options);
  return records;
}

export async function collectSourceRecordsWithDiagnostics(sourcePool, options = {}) {
  const diagnostics = options.diagnostics ?? { attempts: [] };
  const fetchImpl = options.fetchImpl ?? fetch;
  const rssRecords = await collectRSSRecords(sourcePool, {
    date: options.date,
    fetchImpl,
    headers: options.feedHeaders,
    legacySources: options.legacySources,
    limitPerSource: options.adapterLimitPerSource,
    diagnostics
  });
  const adapterRecords = await collectAdapterRecords(sourcePool, {
    fetchImpl,
    headers: options.adapterHeaders,
    limitPerSource: options.adapterLimitPerSource,
    timeoutMs: options.timeoutMs,
    diagnostics
  });

  diagnostics.attempts.sort(compareAttempts);
  return { records: [...rssRecords, ...adapterRecords], diagnostics };
}

export async function collectRSSRecords(sourcePool, options = {}) {
  const records = [];
  const fetchImpl = options.fetchImpl ?? fetch;
  const feedSources = getCollectableFeedSources(sourcePool, { legacySources: options.legacySources ?? [] });

  for (const source of feedSources) {
    try {
      const response = await fetchImpl(source.url, {
        headers: options.headers ?? defaultFeedHeaders
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const body = await response.text();
      const rssRecords = parseRSSRecords(body, source, { date: options.date });
      if (rssRecords.length > 0) {
        records.push(...rssRecords);
        recordCollectionAttempt(options.diagnostics, {
          collector: "rss",
          source,
          status: "ok",
          candidateCount: rssRecords.length,
          url: response.url || source.url
        });
        continue;
      }

      if (shouldTryHTMLFallback(source, response)) {
        const htmlRecords = extractHTMLIndexRecords(body, source, {
          limit: options.limitPerSource,
          pageURL: response.url || source.url
        });
        records.push(...htmlRecords);
        recordCollectionAttempt(options.diagnostics, {
          collector: "rss",
          source,
          status: "ok",
          candidateCount: htmlRecords.length,
          url: response.url || source.url
        });
        continue;
      }

      recordCollectionAttempt(options.diagnostics, {
        collector: "rss",
        source,
        status: "ok",
        candidateCount: 0,
        url: response.url || source.url
      });
    } catch (error) {
      recordCollectionAttempt(options.diagnostics, {
        collector: "rss",
        source,
        status: "error",
        candidateCount: 0,
        error: error.message,
        url: source.url
      });
      console.warn(`Skipping ${source.name}: ${error.message}`);
    }
  }

  return records;
}

export function parseRSSRecords(xml, source, { date = new Date().toISOString().slice(0, 10) } = {}) {
  const itemBlocks = [...String(xml).matchAll(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
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
      sourcePoolId: source.sourcePoolId ?? source.id ?? null,
      authorityTier: source.authorityTier ?? source.authority_tier ?? "C",
      imageUrl,
      imageSource: imageUrl ? "source" : null,
      publishedAt: published ? new Date(published).toISOString() : `${date}T08:00:00Z`,
      fallbackCategory: source.category ?? source.category_ids?.[0] ?? "models_products"
    };
  }).filter((item) => item.sourceUrl);
}

function shouldTryHTMLFallback(source, response) {
  const contentType = response.headers?.get?.("content-type") ?? "";
  return (
    String(source.accessMethod ?? "").includes("html") ||
    contentType.toLowerCase().includes("text/html")
  );
}

function recordCollectionAttempt(diagnostics, { collector, source, status, candidateCount, error = null, url = null }) {
  if (!diagnostics?.attempts) return;
  diagnostics.attempts.push({
    collector,
    source_id: source.sourcePoolId ?? source.id ?? null,
    source_name: source.name,
    source_url: url ?? source.url ?? null,
    status,
    candidate_count: Number(candidateCount ?? 0),
    error
  });
}

function compareAttempts(a, b) {
  const collectorRank = { rss: 0, adapter: 1 };
  const collectorDelta = (collectorRank[a.collector] ?? 99) - (collectorRank[b.collector] ?? 99);
  if (collectorDelta !== 0) return collectorDelta;
  return String(a.source_id ?? a.source_name).localeCompare(String(b.source_id ?? b.source_name));
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

function pick(block, tag) {
  const match = String(block).match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ?? "";
}

function attr(block, tag, name, options = {}) {
  const tagMatch = String(block).match(new RegExp(`<${tag}\\b[^>]*>`, "i"));
  if (!tagMatch) return null;
  const tagText = tagMatch[0];
  if (options.typePrefix) {
    const type = tagText.match(/\stype=["']([^"']+)["']/i)?.[1] ?? "";
    const medium = tagText.match(/\smedium=["']([^"']+)["']/i)?.[1] ?? "";
    if (!type.toLowerCase().startsWith(options.typePrefix) && medium.toLowerCase() !== "image") {
      return null;
    }
  }
  return decodeEntities(tagText.match(new RegExp(`\\s${name}=["']([^"']+)["']`, "i"))?.[1] ?? "");
}

function imageFromHTML(value) {
  const html = decodeEntities(String(value ?? "").replace(/<!\[CDATA\[|\]\]>/g, ""));
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
