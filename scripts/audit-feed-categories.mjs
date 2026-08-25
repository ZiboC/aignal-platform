import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CATEGORY_IDS, classifyRecord } from "../lib/feed-quality/category-classification.mjs";

const args = parseArgs(process.argv.slice(2));
const feedDir = args.feedDir ?? args["feed-dir"] ?? "public/feed/daily";
const reportDir = args.reportDir ?? args["report-dir"] ?? "reports/category-audit";
const minConfidence = Number(args.minConfidence ?? args["min-confidence"] ?? 0.72);
const from = args.from ?? null;
const to = args.to ?? null;

const fileNames = (await readdir(feedDir))
  .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
  .filter((name) => !from || name.slice(0, 10) >= from)
  .filter((name) => !to || name.slice(0, 10) <= to)
  .sort();

const entries = [];
for (const fileName of fileNames) {
  const value = JSON.parse(await readFile(path.join(feedDir, fileName), "utf8"));
  for (const item of Array.isArray(value) ? value : value.items ?? []) {
    if (item.source_name === "Aignal Sample Source") continue;
    entries.push({ ...item, archive_date: fileName.slice(0, 10) });
  }
}

const uniqueItems = dedupeLatest(entries);
const audited = uniqueItems.map((item) => {
  const prediction = classifyRecord({
    title: item.title_en ?? item.title_zh,
    summary: item.summary_en ?? item.summary_zh,
    sourceName: item.source_name,
    fallbackCategory: item.category
  });
  const assignedScore = Number(prediction.scores[item.category] ?? 0);
  return {
    id: item.id,
    archive_date: item.archive_date,
    title: item.title_en ?? item.title_zh,
    source_name: item.source_name,
    original_url: item.original_url,
    assigned_category: item.category,
    predicted_category: prediction.category,
    confidence: prediction.confidence,
    margin: prediction.margin,
    assigned_score: assignedScore,
    predicted_score: Number(prediction.scores[prediction.category] ?? 0),
    evidence: prediction.evidence,
    likely_mismatch: prediction.category !== item.category && prediction.confidence >= minConfidence,
    weak_assigned_evidence: assignedScore < 1
  };
});

const likelyMismatches = audited
  .filter((item) => item.likely_mismatch)
  .sort((a, b) => b.confidence - a.confidence || b.margin - a.margin);
const weakAssignedEvidence = audited.filter((item) => item.weak_assigned_evidence);
const latestDate = fileNames.at(-1)?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
const report = {
  generated_at: new Date().toISOString(),
  date_range: { from: fileNames[0]?.slice(0, 10) ?? null, to: latestDate },
  methodology: {
    mode: "deterministic evidence audit",
    min_confidence: minConfidence,
    notes: [
      "The audit compares each archived category with an independent weighted classifier using title, summary, and source evidence.",
      "Likely mismatch is a review flag, not an automatic historical rewrite.",
      "Repeated archive URLs are counted once using their latest appearance."
    ]
  },
  summary: {
    archive_entries: entries.length,
    unique_signals: audited.length,
    likely_mismatches: likelyMismatches.length,
    likely_mismatch_rate: ratio(likelyMismatches.length, audited.length),
    weak_assigned_evidence: weakAssignedEvidence.length,
    weak_assigned_evidence_rate: ratio(weakAssignedEvidence.length, audited.length)
  },
  assigned_categories: countBy(audited, (item) => item.assigned_category),
  predicted_categories: countBy(audited, (item) => item.predicted_category),
  mismatch_routes: countBy(likelyMismatches, (item) => `${item.assigned_category} -> ${item.predicted_category}`),
  category_review: CATEGORY_IDS.map((category) => ({
    category,
    assigned: audited.filter((item) => item.assigned_category === category).length,
    likely_mismatches: likelyMismatches.filter((item) => item.assigned_category === category).length,
    weak_assigned_evidence: weakAssignedEvidence.filter((item) => item.assigned_category === category).length
  })),
  examples: likelyMismatches.slice(0, 50)
};

await mkdir(reportDir, { recursive: true });
const baseName = `${report.date_range.from ?? "unknown"}_${latestDate}`;
await writeFile(path.join(reportDir, `${baseName}.json`), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(reportDir, `${baseName}.md`), renderMarkdown(report));
console.log(
  `Audited ${report.summary.unique_signals} unique signals: ` +
  `${report.summary.likely_mismatches} likely mismatches (${report.summary.likely_mismatch_rate}%).`
);
console.log(`Category audit written to ${path.join(reportDir, `${baseName}.md`)}`);

function dedupeLatest(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = item.original_url ?? item.id ?? `${item.source_name}:${item.title_en ?? item.title_zh}`;
    byKey.set(key, item);
  }
  return [...byKey.values()];
}

function countBy(items, keyFor) {
  return Object.fromEntries(
    [...items.reduce((counts, item) => {
      const key = keyFor(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map()).entries()].sort((a, b) => b[1] - a[1])
  );
}

function ratio(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 10000) / 100 : 0;
}

function renderMarkdown(report) {
  const lines = [
    "# Aignal Category Consistency Audit",
    "",
    `- Date range: ${report.date_range.from} to ${report.date_range.to}`,
    `- Archive entries: ${report.summary.archive_entries}`,
    `- Unique signals: ${report.summary.unique_signals}`,
    `- Likely mismatches: ${report.summary.likely_mismatches} (${report.summary.likely_mismatch_rate}%)`,
    `- Weak assigned-category evidence: ${report.summary.weak_assigned_evidence} (${report.summary.weak_assigned_evidence_rate}%)`,
    "",
    "## Category Review",
    "",
    "| Category | Assigned | Likely mismatch | Weak evidence |",
    "| --- | ---: | ---: | ---: |",
    ...report.category_review.map((row) =>
      `| ${row.category} | ${row.assigned} | ${row.likely_mismatches} | ${row.weak_assigned_evidence} |`
    ),
    "",
    "## Main Mismatch Routes",
    "",
    ...Object.entries(report.mismatch_routes).map(([route, count]) => `- ${route}: ${count}`),
    "",
    "## High-confidence Examples",
    "",
    ...report.examples.slice(0, 20).flatMap((item) => [
      `### ${item.title}`,
      "",
      `- Date/source: ${item.archive_date} / ${item.source_name}`,
      `- Assigned: ${item.assigned_category}`,
      `- Predicted: ${item.predicted_category}`,
      `- Confidence: ${item.confidence}`,
      `- Evidence: ${item.evidence.join(", ")}`,
      `- URL: ${item.original_url ?? "n/a"}`,
      ""
    ])
  ];
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  return Object.fromEntries(argv.filter((arg) => arg.startsWith("--")).map((arg) => {
    const [key, value = "true"] = arg.slice(2).split("=");
    return [key, value];
  }));
}
