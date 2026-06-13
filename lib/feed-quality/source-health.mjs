const directAccessMethods = new Set(["rss", "api"]);

export async function checkSourceHealth(source, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(source.url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/json, text/html;q=0.8, */*;q=0.5",
        "user-agent": "AignalSourceHealth/0.1 (+https://aignal.local)"
      }
    });
    await response.body?.cancel?.();

    return {
      sourceId: source.id,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      elapsedMs: Date.now() - startedAt,
      error: response.ok ? null : response.statusText || `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      sourceId: source.id,
      ok: false,
      status: null,
      finalUrl: null,
      elapsedMs: Date.now() - startedAt,
      error: error?.name === "TimeoutError" ? "Timeout" : error?.message ?? String(error)
    };
  }
}

export async function checkSourcePoolHealth(sourcePool, options = {}) {
  const sources = sourcePool.sources ?? [];
  const concurrency = Number(options.concurrency ?? 8);
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < sources.length) {
      const source = sources[cursor];
      cursor += 1;
      results.push(await checkSourceHealth(source, options));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, sources.length) }, () => worker()));
  const order = new Map(sources.map((source, index) => [source.id, index]));
  return results.sort((a, b) => (order.get(a.sourceId) ?? 0) - (order.get(b.sourceId) ?? 0));
}

export function buildSourceHealthReport({ sourcePool, results, checkedAt = new Date().toISOString() }) {
  const resultBySourceId = new Map(results.map((result) => [result.sourceId, result]));
  const sources = (sourcePool.sources ?? []).map((source) => {
    const result = resultBySourceId.get(source.id);
    const healthStatus = result ? (result.ok ? "reachable" : "failing") : "unchecked";
    const collectionStatus = directAccessMethods.has(source.access_method) ? "direct" : "needs_adapter";

    return {
      id: source.id,
      name: source.name,
      url: source.url,
      final_url: result?.finalUrl ?? null,
      category_ids: source.category_ids ?? [],
      authority_tier: source.authority_tier,
      access_method: source.access_method,
      collection_status: collectionStatus,
      health_status: healthStatus,
      ok: Boolean(result?.ok),
      status: result?.status ?? null,
      elapsed_ms: result?.elapsedMs ?? null,
      error: result?.error ?? null
    };
  });

  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const categories = (sourcePool.categories ?? []).map((category) => {
    const categorySources = (category.source_ids ?? []).map((sourceId) => sourceById.get(sourceId)).filter(Boolean);
    const reachable = categorySources.filter((source) => source.health_status === "reachable");
    const failing = categorySources.filter((source) => source.health_status === "failing");
    const direct = categorySources.filter((source) => source.collection_status === "direct");
    const adapterNeeded = categorySources.filter((source) => source.collection_status === "needs_adapter");
    const coverageStatus = getCoverageStatus({ reachable, direct, failing });

    return {
      id: category.id,
      label_zh: category.label_zh,
      label_en: category.label_en,
      source_count: categorySources.length,
      reachable_count: reachable.length,
      failing_count: failing.length,
      directly_collectable_count: direct.length,
      adapter_needed_count: adapterNeeded.length,
      coverage_status: coverageStatus,
      failing_source_ids: failing.map((source) => source.id),
      adapter_needed_source_ids: adapterNeeded.map((source) => source.id)
    };
  });

  const reachableSources = sources.filter((source) => source.health_status === "reachable");
  const failingSources = sources.filter((source) => source.health_status === "failing");
  const directSources = sources.filter((source) => source.collection_status === "direct");
  const adapterNeededSources = sources.filter((source) => source.collection_status === "needs_adapter");
  const statusCounts = countBy(sources, (source) => source.health_status);
  const accessMethodCounts = countBy(sources, (source) => source.access_method);

  return {
    checked_at: checkedAt,
    summary: {
      total_sources: sources.length,
      checked_sources: results.length,
      reachable_sources: reachableSources.length,
      failing_sources: failingSources.length,
      directly_collectable_sources: directSources.length,
      adapter_needed_sources: adapterNeededSources.length,
      status_counts: statusCounts,
      access_method_counts: accessMethodCounts
    },
    coverage_gaps: categories
      .filter((category) => category.coverage_status === "no_reachable_sources")
      .map((category) => ({
        category_id: category.id,
        label_zh: category.label_zh,
        label_en: category.label_en,
        reason: "no_reachable_sources"
      })),
    adapter_gaps: categories
      .filter((category) => category.coverage_status === "needs_adapter")
      .map((category) => ({
        category_id: category.id,
        label_zh: category.label_zh,
        label_en: category.label_en,
        reason: "reachable_sources_need_collection_adapters"
      })),
    categories,
    sources
  };
}

export function renderSourceHealthReportMarkdown(report) {
  const failingSources = report.sources.filter((source) => source.health_status === "failing");
  const adapterCategories = report.categories.filter((category) => category.coverage_status === "needs_adapter");

  return [
    "# Source Health Report",
    "",
    `Checked at: ${report.checked_at}`,
    "",
    "## Summary",
    "",
    `- Total sources: ${report.summary.total_sources}`,
    `- Reachable sources: ${report.summary.reachable_sources}`,
    `- Failing sources: ${report.summary.failing_sources}`,
    `- Directly collectable sources: ${report.summary.directly_collectable_sources}`,
    `- Sources needing adapters: ${report.summary.adapter_needed_sources}`,
    "",
    "## Category Coverage",
    "",
    ...report.categories.map((category) => (
      `- ${category.label_zh} / ${category.label_en}: ${category.coverage_status} ` +
      `(${category.reachable_count}/${category.source_count} reachable, ` +
      `${category.directly_collectable_count} direct, ${category.adapter_needed_count} adapter-needed)`
    )),
    "",
    "## Adapter Needed",
    "",
    ...(adapterCategories.length > 0
      ? adapterCategories.map((category) => `- ${category.label_zh} / ${category.label_en}: needs_adapter`)
      : ["- None"]),
    "",
    "## Failing Sources",
    "",
    ...(failingSources.length > 0
      ? failingSources.map((source) => `- ${source.name} (${source.id}): ${source.status ?? "network"} ${source.error ?? ""}`.trim())
      : ["- None"]),
    ""
  ].join("\n");
}

function getCoverageStatus({ reachable, direct, failing }) {
  if (reachable.length === 0) return "no_reachable_sources";
  if (direct.length === 0) return "needs_adapter";
  if (failing.length > 0) return "degraded";
  return "ok";
}

function countBy(items, getKey) {
  const counts = {};
  for (const item of items) {
    const key = getKey(item) ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
