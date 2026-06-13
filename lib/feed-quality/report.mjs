export function buildQualityReport({
  date,
  categories,
  scoredItems,
  duplicateGroups = [],
  minQualityScore = 65
}) {
  const accepted = scoredItems.filter((item) => item.quality_score >= minQualityScore);
  const rejected = scoredItems.filter((item) => item.quality_score < minQualityScore);
  const coverage = {};
  const coverageGaps = [];
  const perSource = {};
  const rejectionReasons = {};
  const warnings = [];

  for (const category of categories) {
    const acceptedInCategory = accepted.filter((item) => item.category === category);
    const rejectedInCategory = rejected.filter((item) => item.category === category);
    coverage[category] = {
      accepted: acceptedInCategory.length,
      rejected: rejectedInCategory.length,
      best_rejected_score: rejectedInCategory.reduce((max, item) => Math.max(max, item.quality_score), 0)
    };
    if (acceptedInCategory.length === 0) {
      coverageGaps.push({
        category,
        best_rejected_score: coverage[category].best_rejected_score,
        reason: "no_candidate_met_quality_threshold"
      });
    }
  }

  for (const item of scoredItems) {
    const key = item.source_pool_id ?? "unknown";
    perSource[key] ??= { accepted: 0, rejected: 0 };
    if (item.quality_score >= minQualityScore) perSource[key].accepted += 1;
    else {
      perSource[key].rejected += 1;
      for (const penalty of item.penalties ?? []) {
        rejectionReasons[penalty] = (rejectionReasons[penalty] ?? 0) + 1;
      }
    }
  }

  if (rejectionReasons.unknown_source_pool) {
    const count = rejectionReasons.unknown_source_pool;
    warnings.push(`${count} candidate${count === 1 ? " was" : "s were"} not matched to the source pool`);
  }

  return {
    date,
    min_quality_score: minQualityScore,
    total_candidates: scoredItems.length,
    accepted_count: accepted.length,
    rejected_count: rejected.length,
    coverage,
    coverage_gaps: coverageGaps,
    duplicate_groups: duplicateGroups,
    per_source: perSource,
    rejection_reasons: rejectionReasons,
    warnings,
    top_rejected: rejected
      .slice()
      .sort((a, b) => b.quality_score - a.quality_score)
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        category: item.category,
        quality_score: item.quality_score,
        penalties: item.penalties ?? []
      }))
  };
}

export function renderQualityReportMarkdown(report) {
  const lines = [
    `# Aignal Quality Report ${report.date}`,
    "",
    `- Total candidates: ${report.total_candidates}`,
    `- Accepted: ${report.accepted_count}`,
    `- Rejected: ${report.rejected_count}`,
    `- Minimum quality score: ${report.min_quality_score}`,
    "",
    "## Coverage Gaps"
  ];

  if (report.coverage_gaps.length === 0) {
    lines.push("- None");
  } else {
    for (const gap of report.coverage_gaps) {
      lines.push(`- ${gap.category}: ${gap.reason}; best rejected score ${gap.best_rejected_score}`);
    }
  }

  lines.push("", "## Warnings");
  if (report.warnings.length === 0) {
    lines.push("- None");
  } else {
    for (const warning of report.warnings) lines.push(`- ${warning}`);
  }

  return `${lines.join("\n")}\n`;
}
