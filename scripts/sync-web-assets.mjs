import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const sourcePublic = path.join(rootDir, "public");
const webPublic = path.join(rootDir, "web", "public");

await mkdir(webPublic, { recursive: true });

for (const name of ["feed", "images"]) {
  const from = path.join(sourcePublic, name);
  const to = path.join(webPublic, name);
  await rm(to, { recursive: true, force: true });
  await cp(from, to, { recursive: true });
}

console.log("Synced feed and image assets into web/public");
