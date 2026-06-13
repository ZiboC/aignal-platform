#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalizeCandidates } from "../lib/feed-quality/canonicalize.mjs";
import { buildQualityReport, renderQualityReportMarkdown } from "../lib/feed-quality/report.mjs";
import { scoreCandidate } from "../lib/feed-quality/scoring.mjs";
import { loadSourcePool } from "../lib/feed-quality/source-pool.mjs";

const args = parseArgs(process.argv.slice(2));
const date = args.date ?? new Date().toISOString().slice(0, 10);
const outDir = args.out ?? "public";
const reportDir = args.reportDir ?? "reports/feed-quality";
const feedPath = args.feed ?? path.join(outDir, "feed", "daily", `${date}.json`);
const sourcePool = await loadSourcePool(args.sourcePool ?? "data/source-pool.json");
const feedItems = JSON.parse(await readFile(feedPath, "utf8"));
const categories = sourcePool.categories.map((category) => category.id);
const sourceByName = new Map(sourcePool.sources.map((source) => [source.name.toLowerCase(), source]));

const candidates = feedItems.map((item) => {
  const source = sourceByName.get(String(item.source_name ?? "").toLowerCase());
  return {
    ...item,
    source_pool_id: item.source_pool_id ?? source?.id ?? null,
    authority_tier: item.authority_tier ?? source?.authority_tier ?? "C"
  };
});

const canonical = canonicalizeCandidates(candidates);
const scoredItems = canonical.items.map((item) => ({
  ...item,
  ...scoreCandidate(item)
}));
const report = buildQualityReport({
  date,
  categories,
  scoredItems,
  duplicateGroups: canonical.duplicateGroups,
  minQualityScore: Number(args.minQualityScore ?? 65)
});

await mkdir(reportDir, { recursive: true });
await writeFile(path.join(reportDir, `${date}.json`), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(reportDir, `${date}.md`), renderQualityReportMarkdown(report));

console.log(`Generated quality report for ${date}`);
console.log(`accepted=${report.accepted_count} rejected=${report.rejected_count} gaps=${report.coverage_gaps.length}`);

function parseArgs(argv) {
  return Object.fromEntries(argv.map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? true];
  }));
}
