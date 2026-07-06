const fallbackImagesByCategory = {
  coding_ai: "/images/fallbacks/coding-ai.svg",
  image_ai: "/images/fallbacks/image-ai.svg",
  video_ai: "/images/fallbacks/video-ai.svg",
  research_papers: "/images/fallbacks/research.svg",
  models_products: "/images/fallbacks/models.svg",
  business_investment: "/images/fallbacks/business.svg",
  tools_apps: "/images/fallbacks/tools.svg"
};

export function buildFreshnessWindow({ date, now = new Date(), hours = 36, asOf = null }) {
  const end = asOf ? new Date(asOf) : getDefaultWindowEnd(date, now);
  return {
    start: new Date(end.getTime() - Number(hours) * 60 * 60 * 1000),
    end
  };
}

export function filterFreshRecords(records, options) {
  const window = buildFreshnessWindow(options);
  return records.filter((record) => {
    const publishedAt = new Date(record.publishedAt);
    if (Number.isNaN(publishedAt.getTime())) return false;
    return publishedAt >= window.start && publishedAt <= window.end;
  });
}

export function selectFreshRecordsWithFallback(records, {
  date,
  now = new Date(),
  hours = 36,
  fallbackHours = 168,
  asOf = null,
  minRecords = 1
}) {
  const primaryHours = Number(hours);
  const fallbackWindowHours = Number(fallbackHours);
  const primaryRecords = filterFreshRecords(records, {
    date,
    now,
    hours: primaryHours,
    asOf
  });

  if (
    primaryRecords.length >= Number(minRecords) ||
    !Number.isFinite(fallbackWindowHours) ||
    fallbackWindowHours <= primaryHours
  ) {
    return {
      records: primaryRecords,
      windowHours: primaryHours,
      usedFallback: false,
      primaryCount: primaryRecords.length
    };
  }

  const fallbackRecords = filterFreshRecords(records, {
    date,
    now,
    hours: fallbackWindowHours,
    asOf
  });

  return {
    records: fallbackRecords,
    windowHours: fallbackWindowHours,
    usedFallback: fallbackRecords.length > primaryRecords.length,
    primaryCount: primaryRecords.length
  };
}

export function ensureFeedItemImage(item, { publicBaseURL = null } = {}) {
  if (item.image_url) return item;

  const fallbackPath = fallbackImagesByCategory[item.category] ?? fallbackImagesByCategory.models_products;
  return {
    ...item,
    image_url: publicBaseURL ? `${publicBaseURL.replace(/\/$/, "")}${fallbackPath}` : fallbackPath,
    image_source: "fallback"
  };
}

export function fallbackImagePaths() {
  return Object.values(fallbackImagesByCategory);
}

function getDefaultWindowEnd(date, now) {
  if (now.toISOString().slice(0, 10) === date) return now;
  return new Date(`${date}T23:59:59.999Z`);
}
