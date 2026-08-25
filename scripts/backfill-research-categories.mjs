import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isResearchSource } from "../lib/feed-quality/category-classification.mjs";

const args = parseArgs(process.argv.slice(2));
const feedRoot = args.feedRoot ?? args["feed-root"] ?? "public/feed";
const dailyDir = path.join(feedRoot, "daily");
const filePaths = (await readdir(dailyDir))
  .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
  .map((name) => path.join(dailyDir, name));
filePaths.push(path.join(feedRoot, "latest.json"));

let changedFiles = 0;
let changedItems = 0;

for (const filePath of filePaths) {
  const value = JSON.parse(await readFile(filePath, "utf8"));
  const items = Array.isArray(value) ? value : value.items ?? [];
  let fileChanged = false;

  for (const item of items) {
    if (!isResearchSource(item) || item.category === "research_papers") continue;
    item.category = "research_papers";
    item.image_name = "research_papers";
    item.tags = [
      "research",
      "papers",
      ...(item.tags ?? []).filter((tag) => ["agents", "models", "open-source"].includes(tag))
    ].filter((tag, index, tags) => tags.indexOf(tag) === index);
    item.category_confidence = Math.max(Number(item.category_confidence ?? 0), 0.98);
    item.classification_method = "heuristic";
    fileChanged = true;
    changedItems += 1;
  }

  if (!fileChanged) continue;
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
  changedFiles += 1;
}

console.log(`Updated ${changedItems} research items across ${changedFiles} feed files.`);

function parseArgs(argv) {
  return Object.fromEntries(argv.filter((arg) => arg.startsWith("--")).map((arg) => {
    const [key, value = "true"] = arg.slice(2).split("=");
    return [key, value];
  }));
}
