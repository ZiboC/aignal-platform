#!/usr/bin/env node
import { loadSourcePool, validateSourcePool } from "../lib/feed-quality/source-pool.mjs";

const args = parseArgs(process.argv.slice(2));
const path = args.path ?? "data/source-pool.json";
const pool = await loadSourcePool(path);
const result = validateSourcePool(pool);

if (!result.ok) {
  console.error(`Source pool validation failed for ${path}`);
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Source pool validation passed for ${path}`);
console.log(`categories=${result.stats.categoryCount} sources=${result.stats.sourceCount}`);
console.log(`tiers=${JSON.stringify(result.stats.tierCounts)}`);

function parseArgs(argv) {
  return Object.fromEntries(argv.map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? true];
  }));
}
