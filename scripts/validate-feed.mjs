import { readFile } from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const date = args.date ?? new Date().toISOString().slice(0, 10);
const outDir = args.out ?? "public";
const minSourceImages = Number(args.minSourceImages ?? 0);
const feedPath = path.join(outDir, "feed", "daily", `${date}.json`);
const latestPath = path.join(outDir, "feed", "latest.json");
const indexPath = path.join(outDir, "feed", "index.json");

const daily = JSON.parse(await readFile(feedPath, "utf8"));
const latest = JSON.parse(await readFile(latestPath, "utf8"));
const index = JSON.parse(await readFile(indexPath, "utf8"));

assert(Array.isArray(daily), "daily feed must be an array");
assert(Array.isArray(latest), "latest feed must be an array");
assert(Array.isArray(index.dates), "index.dates must be an array");
assert(index.dates.includes(date), `index.dates must include ${date}`);
assert(daily.length >= 5 && daily.length <= 15, "daily feed must contain 5-15 items");

for (const item of daily) {
  for (const key of [
    "id",
    "category",
    "title_zh",
    "title_en",
    "summary_zh",
    "summary_en",
    "why_it_matters_zh",
    "why_it_matters_en",
    "source_name",
    "published_at",
    "image_name",
    "tags"
  ]) {
    assert(item[key] !== undefined && item[key] !== "", `item ${item.id ?? "(missing id)"} missing ${key}`);
  }
  assert(item.source_url || item.original_url, `item ${item.id} needs source_url or original_url`);
  assert(Array.isArray(item.tags), `item ${item.id} tags must be an array`);
  assert(!Number.isNaN(Date.parse(item.published_at)), `item ${item.id} has invalid published_at`);
}

const sourceImageCount = daily.filter((item) => item.image_url && item.image_source === "source").length;
assert(
  sourceImageCount >= minSourceImages,
  `daily feed must contain at least ${minSourceImages} source images; found ${sourceImageCount}`
);

console.log(`Validated ${daily.length} items for ${date}`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  return Object.fromEntries(argv.map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? true];
  }));
}
