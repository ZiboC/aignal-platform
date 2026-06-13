#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildSourceHealthReport,
  checkSourcePoolHealth,
  renderSourceHealthReportMarkdown
} from "../lib/feed-quality/source-health.mjs";
import { loadSourcePool } from "../lib/feed-quality/source-pool.mjs";

const args = parseArgs(process.argv.slice(2));
const sourcePool = await loadSourcePool(args.sourcePool ?? "data/source-pool.json");
const reportDir = args.reportDir ?? "reports/source-health";
const checkedAt = args.checkedAt ?? new Date().toISOString();
const date = args.date ?? checkedAt.slice(0, 10);
const timeoutMs = Number(args.timeoutMs ?? 8000);
const concurrency = Number(args.concurrency ?? 8);

const results = await checkSourcePoolHealth(sourcePool, { timeoutMs, concurrency });
const report = buildSourceHealthReport({ sourcePool, results, checkedAt });
const markdown = renderSourceHealthReportMarkdown(report);

await mkdir(reportDir, { recursive: true });
await writeFile(path.join(reportDir, `${date}.json`), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(reportDir, `${date}.md`), markdown);
await writeFile(path.join(reportDir, "latest.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(reportDir, "latest.md"), markdown);

console.log(`Generated source health report for ${date}`);
console.log(
  `reachable=${report.summary.reachable_sources} ` +
  `failing=${report.summary.failing_sources} ` +
  `adapter-needed=${report.summary.adapter_needed_sources} ` +
  `coverage-gaps=${report.coverage_gaps.length}`
);

if (report.summary.failing_sources > 0) {
  console.log("Failing sources:");
  for (const source of report.sources.filter((entry) => entry.health_status === "failing").slice(0, 10)) {
    console.log(`- ${source.name} (${source.id}): ${source.status ?? "network"} ${source.error ?? ""}`.trim());
  }
}

function parseArgs(argv) {
  return Object.fromEntries(argv.map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? true];
  }));
}
