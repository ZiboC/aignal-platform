#!/usr/bin/env node
import { spawn } from "node:child_process";
import { buildBackfillDates } from "../lib/feed-quality/backfill.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.from || !args.to) {
  console.error("Usage: npm run backfill-feed -- --from=YYYY-MM-DD --to=YYYY-MM-DD");
  process.exit(1);
}

const dates = buildBackfillDates({ from: args.from, to: args.to });
const passThroughArgs = [
  args.out ? `--out=${args.out}` : null,
  args.limit ? `--limit=${args.limit}` : null,
  args.freshWindowHours ? `--fresh-window-hours=${args.freshWindowHours}` : null,
  args["fresh-window-hours"] ? `--fresh-window-hours=${args["fresh-window-hours"]}` : null,
  args.generateImages ? `--generateImages=${args.generateImages}` : null,
  args.imageLimit ? `--imageLimit=${args.imageLimit}` : null
].filter(Boolean);

for (const date of dates) {
  console.log(`\n=== Backfilling ${date} ===`);
  await run("node", ["scripts/generate-feed.mjs", `--date=${date}`, ...passThroughArgs]);
}

console.log(`\nBackfilled ${dates.length} date(s): ${dates[0]} to ${dates[dates.length - 1]}`);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
    child.on("error", reject);
  });
}

function parseArgs(argv) {
  return Object.fromEntries(argv.map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? true];
  }));
}
