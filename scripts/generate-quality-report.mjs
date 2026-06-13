#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzeFeedItemsWithQuality } from "../lib/feed-quality/feed-items.mjs";
import { buildQualityReport, renderQualityReportMarkdown } from "../lib/feed-quality/report.mjs";
import { loadSourcePool } from "../lib/feed-quality/source-pool.mjs";

const args = parseArgs(process.argv.slice(2));
const date = args.date ?? new Date().toISOString().slice(0, 10);
const outDir = args.out ?? "public";
const reportDir = args.reportDir ?? "reports/feed-quality";
const feedPath = args.feed ?? path.join(outDir, "feed", "daily", `${date}.json`);
const sourcePool = await loadSourcePool(args.sourcePool ?? "data/source-pool.json");
const feedItems = JSON.parse(await readFile(feedPath, "utf8"));
const categories = sourcePool.categories.map((category) => category.id);
const analysis = analyzeFeedItemsWithQuality(feedItems, sourcePool);
const report = buildQualityReport({
  date,
  categories,
  scoredItems: analysis.items,
  duplicateGroups: analysis.duplicateGroups,
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
