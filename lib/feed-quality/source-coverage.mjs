export function buildSourceCoverageReport({
  date,
  sourcePool,
  collectionDiagnostics = { attempts: [] },
  allRecords = [],
  freshRecords = [],
  dedupedRecords = [],
  selectedRecords = [],
  finalItems = [],
  freshnessWindow = null,
  selectionDiagnostics = { not_selected: [] },
  categoryCoverageTarget = 1,
  minQualityScore = 65,
  recordCategory = defaultRecordCategory,
  qualityRejectedRecords = []
}) {
  const sources = sourcePool.sources ?? [];
  const categories = sourcePool.categories ?? [];
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const sourceIdByName = new Map(sources.map((source) => [normalizeName(source.name), source.id]));
  const attemptsBySource = groupAttempts(collectionDiagnostics.attempts ?? []);
  const freshSet = new Set(freshRecords);
  const dedupedSet = new Set(dedupedRecords);
  const selectedSet = new Set(selectedRecords);
  const selectionReasonByRecord = new Map(
    (selectionDiagnostics.not_selected ?? [])
      .filter((entry) => entry.record)
      .map((entry) => [entry.record, entry.reason ?? "ranking_limit_after_image_date_sort"])
  );
  const finalItemsBySource = countBy(finalItems, (item) => item.source_pool_id ?? sourceIdByName.get(normalizeName(item.source_name)) ?? "unknown");
  const finalLowQualityBySource = countBy(
    finalItems.filter((item) => Number(item.quality_score ?? 100) < Number(minQualityScore)),
    (item) => item.source_pool_id ?? sourceIdByName.get(normalizeName(item.source_name)) ?? "unknown"
  );
  const recordsBySource = new Map();
  const sourceStats = new Map(sources.map((source) => [source.id, emptySourceStats(source)]));
  let unknownCandidateRecords = 0;

  for (const record of allRecords) {
    const sourceId = sourceIdForRecord(record, sourceIdByName);
    if (!sourceStats.has(sourceId)) {
      unknownCandidateRecords += 1;
      continue;
    }
    if (!recordsBySource.has(sourceId)) recordsBySource.set(sourceId, []);
    recordsBySource.get(sourceId).push(record);
    const stats = sourceStats.get(sourceId);
    stats.candidate_count += 1;

    const freshness = freshnessState(record, freshnessWindow, freshSet);
    if (freshness === "fresh") stats.fresh_candidate_count += 1;
    else if (freshness === "stale") stats.stale_filtered_count += 1;
    else if (freshness === "future") stats.future_filtered_count += 1;
    else stats.invalid_date_count += 1;
  }

  for (const record of freshRecords) {
    const sourceId = sourceIdForRecord(record, sourceIdByName);
    const stats = sourceStats.get(sourceId);
    if (!stats) continue;
    if (!dedupedSet.has(record)) stats.duplicate_filtered_count += 1;
  }

  for (const record of dedupedRecords) {
    const sourceId = sourceIdForRecord(record, sourceIdByName);
    const stats = sourceStats.get(sourceId);
    if (!stats) continue;
    stats.deduped_candidate_count += 1;
    if (!selectedSet.has(record)) {
      const reason = selectionReasonByRecord.get(record) ?? "ranking_limit_after_image_date_sort";
      stats.selection_filtered_count += 1;
      stats.selection_filtered_reasons[reason] = (stats.selection_filtered_reasons[reason] ?? 0) + 1;
    }
  }

  for (const record of selectedRecords) {
    const sourceId = sourceIdForRecord(record, sourceIdByName);
    const stats = sourceStats.get(sourceId);
    if (stats) stats.selected_record_count += 1;
  }

  for (const [sourceId, count] of Object.entries(finalItemsBySource)) {
    const stats = sourceStats.get(sourceId);
    if (stats) stats.final_item_count = count;
  }

  for (const [sourceId, count] of Object.entries(finalLowQualityBySource)) {
    const stats = sourceStats.get(sourceId);
    if (stats) stats.final_below_quality_threshold_count = count;
  }

  const attemptSourceIds = new Set();
  for (const [sourceId, attempts] of attemptsBySource) {
    if (!sourceStats.has(sourceId)) continue;
    attemptSourceIds.add(sourceId);
    const stats = sourceStats.get(sourceId);
    stats.attempted = true;
    stats.collectors_attempted = [...new Set(attempts.map((attempt) => attempt.collector))].sort();
    stats.attempt_count = attempts.length;
    stats.collection_candidate_count = attempts.reduce((sum, attempt) => sum + Number(attempt.candidate_count ?? 0), 0);
    stats.collection_errors = attempts
      .filter((attempt) => attempt.status === "error")
      .map((attempt) => ({
        collector: attempt.collector,
        error: attempt.error ?? "unknown_error"
      }));
  }

  const reportSources = sources.map((source) => {
    const stats = sourceStats.get(source.id);
    return {
      ...stats,
      exclusion_reason: sourceExclusionReason(stats)
    };
  });

  const categoryReports = categories.map((category) => buildCategoryCoverage({
    category,
    sourcePool,
    attemptsBySource,
    allRecords,
    freshRecords,
    dedupedRecords,
    selectedRecords,
    finalItems,
    recordCategory,
    categoryCoverageTarget
  }));

  const qualityFilteredRecords = qualityRejectedRecords.length;
  const selectionFilteredByReason = mergeReasonCounts(reportSources, "selection_filtered_reasons");
  const summary = {
    total_pool_sources: sources.length,
    attempted_sources: attemptSourceIds.size,
    unattempted_sources: sources.length - attemptSourceIds.size,
    sources_with_candidates: reportSources.filter((source) => source.candidate_count > 0).length,
    fresh_candidate_sources: reportSources.filter((source) => source.fresh_candidate_count > 0).length,
    final_unique_sources: reportSources.filter((source) => source.final_item_count > 0).length,
    total_candidate_records: allRecords.length,
    unknown_candidate_records: unknownCandidateRecords,
    fresh_candidate_records: freshRecords.length,
    deduped_candidate_records: dedupedRecords.length,
    selected_records: selectedRecords.length,
    final_items: finalItems.length,
    stale_filtered_records: sum(reportSources, "stale_filtered_count"),
    future_filtered_records: sum(reportSources, "future_filtered_count"),
    invalid_date_records: sum(reportSources, "invalid_date_count"),
    duplicate_filtered_records: sum(reportSources, "duplicate_filtered_count"),
    selection_filtered_records: sum(reportSources, "selection_filtered_count"),
    selection_filtered_by_reason: selectionFilteredByReason,
    quality_filtered_records: qualityFilteredRecords,
    final_below_quality_threshold_records: sum(reportSources, "final_below_quality_threshold_count"),
    min_quality_score: Number(minQualityScore)
  };

  const bottlenecks = Object.entries(countBy(reportSources, (source) => source.exclusion_reason))
    .filter(([reason]) => reason !== "selected")
    .map(([reason, sourceCount]) => ({ reason, source_count: sourceCount }))
    .sort((a, b) => b.source_count - a.source_count || a.reason.localeCompare(b.reason));

  return {
    date,
    generated_at: new Date().toISOString(),
    freshness_window: freshnessWindow ? {
      start: freshnessWindow.start?.toISOString?.() ?? String(freshnessWindow.start),
      end: freshnessWindow.end?.toISOString?.() ?? String(freshnessWindow.end),
      hours: freshnessWindow.hours ?? null
    } : null,
    category_coverage_target: Number(categoryCoverageTarget),
    summary,
    bottlenecks,
    categories: categoryReports,
    sources: reportSources,
    pipeline_notes: [
      "generate-feed applies collection, freshness filtering, URL/title dedupe, image-first/date ranking, source/category caps, and final slot filling.",
      "No pre-selection quality gate is applied in generate-feed; quality scores are added after final selection.",
      `quality_filtered_records is ${qualityFilteredRecords} unless a caller supplies explicit qualityRejectedRecords.`
    ]
  };
}

export function renderSourceCoverageReportMarkdown(report) {
  const lines = [
    `# Aignal Source Coverage Diagnostic ${report.date}`,
    "",
    "## Summary",
    `- Source pool: ${report.summary.total_pool_sources} sources`,
    `- Attempted sources: ${report.summary.attempted_sources}`,
    `- Sources with candidates: ${report.summary.sources_with_candidates}`,
    `- Fresh candidate sources: ${report.summary.fresh_candidate_sources}`,
    `- Final unique sources: ${report.summary.final_unique_sources}`,
    `- Candidate records: ${report.summary.total_candidate_records}`,
    `- Fresh records: ${report.summary.fresh_candidate_records}`,
    `- Deduped records: ${report.summary.deduped_candidate_records}`,
    `- Selected records: ${report.summary.selected_records}`,
    `- Final items: ${report.summary.final_items}`,
    `- Stale filtered records: ${report.summary.stale_filtered_records}`,
    `- Duplicate filtered records: ${report.summary.duplicate_filtered_records}`,
    `- Quality filtered records: ${report.summary.quality_filtered_records}`,
    "",
    "## Bottlenecks"
  ];

  if (!report.bottlenecks?.length) {
    lines.push("- None");
  } else {
    for (const item of report.bottlenecks) {
      lines.push(`- ${item.reason}: ${item.source_count} ${item.source_count === 1 ? "source" : "sources"}`);
    }
  }

  const selectionReasons = Object.entries(report.summary.selection_filtered_by_reason ?? {});
  lines.push("", "## Selection Filters");
  if (selectionReasons.length === 0) {
    lines.push("- None");
  } else {
    for (const [reason, count] of selectionReasons) {
      lines.push(`- ${reason}: ${count} ${count === 1 ? "record" : "records"}`);
    }
  }

  lines.push("", "## Category Coverage");
  if (!report.categories?.length) {
    lines.push("- None");
  } else {
    lines.push("| Category | Final items | Final sources | Target met | Fresh candidates | Selected |");
    lines.push("| --- | ---: | ---: | --- | ---: | ---: |");
    for (const category of report.categories) {
      lines.push([
        `| ${category.label_en ?? category.id}`,
        category.final_item_count,
        category.final_unique_sources,
        category.coverage_target_met ? "yes" : "no",
        category.fresh_candidate_count,
        `${category.selected_record_count} |`
      ].join(" | "));
    }
  }

  lines.push("", "## Pipeline Notes");
  for (const note of report.pipeline_notes ?? []) lines.push(`- ${note}`);

  const excludedSources = (report.sources ?? [])
    .filter((source) => source.exclusion_reason !== "selected")
    .sort((a, b) => b.candidate_count - a.candidate_count || a.id.localeCompare(b.id))
    .slice(0, 12);
  lines.push("", "## Top Excluded Sources");
  if (excludedSources.length === 0) {
    lines.push("- None");
  } else {
    for (const source of excludedSources) {
      lines.push(
        `- ${source.name} (${source.id}): ${source.exclusion_reason}; ` +
        `candidates=${source.candidate_count}, fresh=${source.fresh_candidate_count}, ` +
        `deduped=${source.deduped_candidate_count}, selected=${source.selected_record_count}`
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function emptySourceStats(source) {
  return {
    id: source.id,
    name: source.name,
    url: source.url,
    category_ids: source.category_ids ?? [],
    authority_tier: source.authority_tier ?? null,
    access_method: source.access_method ?? null,
    attempted: false,
    collectors_attempted: [],
    attempt_count: 0,
    collection_candidate_count: 0,
    collection_errors: [],
    candidate_count: 0,
    fresh_candidate_count: 0,
    stale_filtered_count: 0,
    future_filtered_count: 0,
    invalid_date_count: 0,
    duplicate_filtered_count: 0,
    deduped_candidate_count: 0,
    selection_filtered_count: 0,
    selected_record_count: 0,
    quality_filtered_count: 0,
    final_item_count: 0,
    final_below_quality_threshold_count: 0,
    selection_filtered_reasons: {}
  };
}

function groupAttempts(attempts) {
  const grouped = new Map();
  for (const attempt of attempts) {
    const sourceId = attempt.source_id ?? null;
    if (!sourceId) continue;
    if (!grouped.has(sourceId)) grouped.set(sourceId, []);
    grouped.get(sourceId).push(attempt);
  }
  return grouped;
}

function buildCategoryCoverage({
  category,
  sourcePool,
  attemptsBySource,
  allRecords,
  freshRecords,
  dedupedRecords,
  selectedRecords,
  finalItems,
  recordCategory,
  categoryCoverageTarget
}) {
  const sourceIds = new Set(category.source_ids ?? []);
  const sourceById = new Map((sourcePool.sources ?? []).map((source) => [source.id, source]));
  const attemptedSourceCount = [...sourceIds].filter((sourceId) => attemptsBySource.has(sourceId)).length;
  const finalItemsInCategory = finalItems.filter((item) => item.category === category.id);
  const finalSourceIds = new Set(finalItemsInCategory.map((item) => item.source_pool_id ?? item.source_name).filter(Boolean));
  const recordMatchesCategory = (record) => {
    const assigned = recordCategory(record);
    if (assigned) return assigned === category.id;
    const source = sourceById.get(record.sourcePoolId ?? record.source_pool_id);
    return Boolean(source?.category_ids?.includes(category.id));
  };

  const selectedCount = selectedRecords.filter(recordMatchesCategory).length;
  const finalCount = finalItemsInCategory.length;

  return {
    id: category.id,
    label_en: category.label_en ?? category.label ?? category.id,
    label_zh: category.label_zh ?? category.id,
    source_count: sourceIds.size,
    attempted_source_count: attemptedSourceCount,
    candidate_count: allRecords.filter(recordMatchesCategory).length,
    fresh_candidate_count: freshRecords.filter(recordMatchesCategory).length,
    deduped_candidate_count: dedupedRecords.filter(recordMatchesCategory).length,
    selected_record_count: selectedCount,
    final_item_count: finalCount,
    final_unique_sources: finalSourceIds.size,
    coverage_target: Number(categoryCoverageTarget),
    coverage_target_met: finalCount >= Number(categoryCoverageTarget),
    coverage_status: finalCount >= Number(categoryCoverageTarget) ? "met" : "below_target"
  };
}

function sourceExclusionReason(stats) {
  if (stats.final_item_count > 0) return "selected";
  if (!stats.attempted) return "not_attempted";
  if (stats.collection_errors.length > 0 && stats.candidate_count === 0) return "attempt_failed";
  if (stats.candidate_count === 0) return "no_candidates";
  if (stats.fresh_candidate_count === 0 && stats.stale_filtered_count > 0) return "all_candidates_stale";
  if (stats.fresh_candidate_count === 0) return "no_fresh_candidates";
  if (stats.duplicate_filtered_count >= stats.fresh_candidate_count) return "duplicate_filtered";
  if (stats.selected_record_count === 0 && stats.deduped_candidate_count > 0) return "not_selected_by_ranking_or_caps";
  if (stats.selected_record_count > stats.final_item_count) return "removed_after_selection";
  return "not_selected";
}

function freshnessState(record, window, freshSet) {
  if (freshSet.has(record)) return "fresh";
  const publishedAt = new Date(record.publishedAt ?? record.published_at);
  if (Number.isNaN(publishedAt.getTime())) return "invalid";
  if (!window) return "stale";
  const start = new Date(window.start);
  const end = new Date(window.end);
  if (publishedAt < start) return "stale";
  if (publishedAt > end) return "future";
  return "fresh";
}

function sourceIdForRecord(record, sourceIdByName) {
  return (
    record.sourcePoolId ??
    record.source_pool_id ??
    sourceIdByName.get(normalizeName(record.sourceName ?? record.source_name)) ??
    "unknown"
  );
}

function defaultRecordCategory(record) {
  return record.category ?? record.fallbackCategory ?? record.fallback_category ?? null;
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function mergeReasonCounts(items, key) {
  const merged = {};
  for (const item of items) {
    for (const [reason, count] of Object.entries(item[key] ?? {})) {
      merged[reason] = (merged[reason] ?? 0) + Number(count ?? 0);
    }
  }
  return merged;
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] ?? 0), 0);
}

function normalizeName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}
