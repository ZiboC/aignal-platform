# Signal Quality Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Aignal Signal Quality / Ranking tool layer: source pool validation, canonical dedupe, deterministic scoring, and daily quality reporting.

**Architecture:** Keep this as a Node 20 ESM tooling layer under `lib/feed-quality/`, with thin CLI wrappers in `scripts/`. The existing feed JSON schema remains compatible; new quality fields are optional and can be adopted by `scripts/generate-feed.mjs` later.

**Tech Stack:** Node 20 ESM, built-in `node:test`, built-in `node:assert/strict`, current JSON feed files under `public/feed`, source pool registry under `data/source-pool.json`.

---

## File Structure

- Create `lib/feed-quality/source-pool.mjs`: load and validate `data/source-pool.json`.
- Create `lib/feed-quality/canonicalize.mjs`: normalize URLs/text and group duplicate candidate signals.
- Create `lib/feed-quality/scoring.mjs`: deterministic quality scoring for candidate signals.
- Create `lib/feed-quality/report.mjs`: aggregate scored candidates into a quality report.
- Create `scripts/validate-source-pool.mjs`: CLI for source pool validation.
- Create `scripts/generate-quality-report.mjs`: CLI that reads a feed file and emits JSON/Markdown quality report.
- Create `tests/feed-quality/source-pool.test.mjs`: source pool unit tests.
- Create `tests/feed-quality/canonicalize.test.mjs`: canonical dedupe unit tests.
- Create `tests/feed-quality/scoring.test.mjs`: ranking score unit tests.
- Create `tests/feed-quality/report.test.mjs`: quality report unit tests.
- Modify `package.json`: add quality test and CLI scripts.

---

### Task 1: Source Pool Loader And Validator

**Files:**
- Create: `lib/feed-quality/source-pool.mjs`
- Test: `tests/feed-quality/source-pool.test.mjs`

- [ ] **Step 1: Write the failing source pool tests**

Create `tests/feed-quality/source-pool.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { validateSourcePool, getSourcesForCategory } from "../../lib/feed-quality/source-pool.mjs";

const validPool = {
  schema_version: 1,
  updated_at: "2026-06-10",
  categories: [
    { id: "coding_ai", label_zh: "写代码 AI", label_en: "Coding AI", source_ids: ["openai_blog"] }
  ],
  sources: [
    {
      id: "openai_blog",
      name: "OpenAI Blog",
      url: "https://openai.com/news/rss.xml",
      category_ids: ["coding_ai"],
      authority_tier: "S",
      source_type: "official_blog_rss",
      access_method: "rss",
      refresh_cadence: "daily",
      verification_rule: "Official OpenAI announcements."
    }
  ]
};

test("validateSourcePool accepts a valid source pool", () => {
  const result = validateSourcePool(validPool);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.stats.categoryCount, 1);
  assert.equal(result.stats.sourceCount, 1);
});

test("validateSourcePool reports missing category source references", () => {
  const pool = structuredClone(validPool);
  pool.categories[0].source_ids.push("missing_source");
  const result = validateSourcePool(pool);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /missing_source/);
});

test("validateSourcePool reports invalid source category references", () => {
  const pool = structuredClone(validPool);
  pool.sources[0].category_ids.push("missing_category");
  const result = validateSourcePool(pool);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /missing_category/);
});

test("getSourcesForCategory returns category sources in registry order", () => {
  const result = getSourcesForCategory(validPool, "coding_ai");
  assert.deepEqual(result.map((source) => source.id), ["openai_blog"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/feed-quality/source-pool.test.mjs
```

Expected: FAIL with module not found for `lib/feed-quality/source-pool.mjs`.

- [ ] **Step 3: Implement source pool loader and validator**

Create `lib/feed-quality/source-pool.mjs`:

```js
import { readFile } from "node:fs/promises";

const allowedTiers = new Set(["S", "A", "B", "C"]);

export async function loadSourcePool(path = "data/source-pool.json") {
  return JSON.parse(await readFile(path, "utf8"));
}

export function validateSourcePool(pool) {
  const errors = [];
  const categories = Array.isArray(pool?.categories) ? pool.categories : [];
  const sources = Array.isArray(pool?.sources) ? pool.sources : [];
  const categoryIds = new Set();
  const sourceIds = new Set();
  const tierCounts = {};

  if (pool?.schema_version !== 1) {
    errors.push("schema_version must be 1");
  }

  for (const category of categories) {
    if (!category.id) errors.push("category missing id");
    if (categoryIds.has(category.id)) errors.push(`duplicate category id: ${category.id}`);
    categoryIds.add(category.id);
    if (!Array.isArray(category.source_ids)) {
      errors.push(`category ${category.id} source_ids must be an array`);
    }
  }

  for (const source of sources) {
    if (!source.id) errors.push("source missing id");
    if (sourceIds.has(source.id)) errors.push(`duplicate source id: ${source.id}`);
    sourceIds.add(source.id);
    if (!allowedTiers.has(source.authority_tier)) {
      errors.push(`source ${source.id} has invalid authority_tier: ${source.authority_tier}`);
    }
    if (!Array.isArray(source.category_ids) || source.category_ids.length === 0) {
      errors.push(`source ${source.id} category_ids must be a non-empty array`);
    }
    tierCounts[source.authority_tier] = (tierCounts[source.authority_tier] ?? 0) + 1;
  }

  for (const category of categories) {
    for (const sourceId of category.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`category ${category.id} references missing source ${sourceId}`);
      }
    }
  }

  for (const source of sources) {
    for (const categoryId of source.category_ids ?? []) {
      if (!categoryIds.has(categoryId)) {
        errors.push(`source ${source.id} references missing category ${categoryId}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    stats: {
      categoryCount: categories.length,
      sourceCount: sources.length,
      tierCounts
    }
  };
}

export function getSourcesForCategory(pool, categoryId) {
  const category = pool.categories.find((entry) => entry.id === categoryId);
  if (!category) return [];
  const sourcesById = new Map(pool.sources.map((source) => [source.id, source]));
  return category.source_ids.map((sourceId) => sourcesById.get(sourceId)).filter(Boolean);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test tests/feed-quality/source-pool.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/feed-quality/source-pool.mjs tests/feed-quality/source-pool.test.mjs
git commit -m "Add source pool validation"
```

---

### Task 2: Source Pool Validation CLI

**Files:**
- Create: `scripts/validate-source-pool.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add the validation CLI script**

Create `scripts/validate-source-pool.mjs`:

```js
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
```

- [ ] **Step 2: Add package scripts**

Modify `package.json` scripts:

```json
{
  "validate-source-pool": "node scripts/validate-source-pool.mjs",
  "test:quality": "node --test tests/feed-quality/*.test.mjs"
}
```

Keep existing scripts unchanged.

- [ ] **Step 3: Run CLI validation**

Run:

```bash
npm run validate-source-pool
```

Expected:

```text
Source pool validation passed for data/source-pool.json
categories=7 sources=69
```

- [ ] **Step 4: Run quality tests**

Run:

```bash
npm run test:quality
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/validate-source-pool.mjs
git commit -m "Add source pool validation CLI"
```

---

### Task 3: Canonical Dedupe Helper

**Files:**
- Create: `lib/feed-quality/canonicalize.mjs`
- Test: `tests/feed-quality/canonicalize.test.mjs`

- [ ] **Step 1: Write failing canonicalization tests**

Create `tests/feed-quality/canonicalize.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeCandidates, normalizeSignalUrl, normalizeSignalTitle } from "../../lib/feed-quality/canonicalize.mjs";

test("normalizeSignalUrl strips hash and utm params", () => {
  assert.equal(
    normalizeSignalUrl("https://example.com/post/?utm_source=x&id=1#section"),
    "https://example.com/post?id=1"
  );
});

test("normalizeSignalTitle removes noisy punctuation and lowercases", () => {
  assert.equal(normalizeSignalTitle("  OpenAI launches GPT-5!!! "), "openai launches gpt 5");
});

test("canonicalizeCandidates groups duplicate original URLs", () => {
  const candidates = [
    { id: "a", title_en: "OpenAI launches model", original_url: "https://example.com/a?utm_source=x", source_pool_id: "openai_blog", authority_tier: "S" },
    { id: "b", title_en: "OpenAI launches model", original_url: "https://example.com/a", source_pool_id: "another_source", authority_tier: "A" }
  ];

  const result = canonicalizeCandidates(candidates);
  assert.equal(result.items.length, 1);
  assert.equal(result.duplicateGroups.length, 1);
  assert.equal(result.items[0].supporting_sources.length, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/feed-quality/canonicalize.test.mjs
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement canonicalization**

Create `lib/feed-quality/canonicalize.mjs`:

```js
const tierRank = { S: 4, A: 3, B: 2, C: 1 };

export function normalizeSignalUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return String(value).trim().replace(/\/$/, "").toLowerCase();
  }
}

export function normalizeSignalTitle(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function getCanonicalKey(candidate) {
  const url = normalizeSignalUrl(candidate.original_url ?? candidate.originalUrl ?? candidate.source_url ?? candidate.sourceUrl);
  if (url) return `url:${url}`;
  return `title:${normalizeSignalTitle(candidate.title_en ?? candidate.title ?? candidate.title_zh)}`;
}

export function canonicalizeCandidates(candidates) {
  const groups = new Map();
  for (const candidate of candidates) {
    const key = getCanonicalKey(candidate);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
  }

  const items = [];
  const duplicateGroups = [];

  for (const [canonicalId, group] of groups) {
    const sorted = [...group].sort((a, b) => (tierRank[b.authority_tier] ?? 0) - (tierRank[a.authority_tier] ?? 0));
    const primary = sorted[0];
    const supportingSources = sorted.map((item) => ({
      source_pool_id: item.source_pool_id ?? null,
      source_name: item.source_name ?? item.sourceName ?? null,
      url: item.original_url ?? item.originalUrl ?? item.source_url ?? item.sourceUrl ?? null,
      authority_tier: item.authority_tier ?? null
    }));

    items.push({
      ...primary,
      canonical_id: canonicalId,
      supporting_sources: supportingSources,
      dedupe_confidence: group.length > 1 ? 0.95 : 1
    });

    if (group.length > 1) {
      duplicateGroups.push({
        canonical_id: canonicalId,
        count: group.length,
        kept_id: primary.id,
        duplicate_ids: sorted.slice(1).map((item) => item.id)
      });
    }
  }

  return { items, duplicateGroups };
}
```

- [ ] **Step 4: Run canonicalization tests**

Run:

```bash
node --test tests/feed-quality/canonicalize.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/feed-quality/canonicalize.mjs tests/feed-quality/canonicalize.test.mjs
git commit -m "Add canonical signal dedupe"
```

---

### Task 4: Deterministic Quality Scoring

**Files:**
- Create: `lib/feed-quality/scoring.mjs`
- Test: `tests/feed-quality/scoring.test.mjs`

- [ ] **Step 1: Write failing scoring tests**

Create `tests/feed-quality/scoring.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { scoreCandidate } from "../../lib/feed-quality/scoring.mjs";

test("scoreCandidate rewards authoritative builder-relevant signals", () => {
  const result = scoreCandidate({
    title_en: "NVIDIA releases TensorRT inference update for production AI deployment",
    summary_en: "The release improves inference latency and deployment workflows for developers.",
    authority_tier: "S",
    category: "tools_apps",
    source_pool_id: "nvidia_developer_blog",
    original_url: "https://developer.nvidia.com/blog/example"
  });

  assert.equal(result.authority_tier, "S");
  assert.ok(result.quality_score >= 65);
  assert.match(result.ranking_reason, /authoritative/i);
});

test("scoreCandidate penalizes weak discovery-only candidates", () => {
  const result = scoreCandidate({
    title_en: "Cool AI app is trending",
    summary_en: "People are talking about it.",
    authority_tier: "C",
    category: "tools_apps",
    source_pool_id: "community_thread"
  });

  assert.ok(result.quality_score < 65);
  assert.ok(result.penalties.includes("community_source_requires_verification"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/feed-quality/scoring.test.mjs
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement scoring**

Create `lib/feed-quality/scoring.mjs`:

```js
const tierScore = { S: 100, A: 82, B: 62, C: 35 };
const builderTerms = [
  "api", "sdk", "developer", "deploy", "deployment", "benchmark", "inference",
  "model", "agent", "workflow", "tool", "release", "changelog", "open source",
  "latency", "eval", "evaluation", "production", "enterprise"
];
const impactTerms = [
  "launch", "release", "partnership", "funding", "safety", "governance",
  "frontier", "state of the art", "benchmark", "open weight", "research"
];
const actionTerms = [
  "use", "build", "deploy", "integrate", "available", "download", "api",
  "github", "docs", "guide", "tutorial", "try"
];

export function scoreCandidate(candidate) {
  const text = `${candidate.title_en ?? candidate.title ?? ""} ${candidate.summary_en ?? candidate.summary ?? ""}`.toLowerCase();
  const authorityTier = candidate.authority_tier ?? "C";
  const sourceScore = tierScore[authorityTier] ?? 0;
  const builderRelevanceScore = keywordScore(text, builderTerms);
  const impactScore = keywordScore(text, impactTerms);
  const actionabilityScore = keywordScore(text, actionTerms);
  const noveltyScore = candidate.published_at || candidate.publishedAt ? 80 : 55;
  const contentQualityScore = text.length >= 160 ? 85 : text.length >= 80 ? 65 : 45;
  const penalties = [];

  let weighted =
    sourceScore * 0.25 +
    builderRelevanceScore * 0.25 +
    impactScore * 0.20 +
    actionabilityScore * 0.15 +
    noveltyScore * 0.10 +
    contentQualityScore * 0.05;

  if (authorityTier === "C") {
    penalties.push("community_source_requires_verification");
    weighted -= 20;
  }

  if (!candidate.original_url && !candidate.originalUrl && !candidate.source_url && !candidate.sourceUrl) {
    penalties.push("missing_source_url");
    weighted -= 15;
  }

  const qualityScore = clamp(Math.round(weighted));

  return {
    quality_score: qualityScore,
    source_score: Math.round(sourceScore),
    builder_relevance_score: Math.round(builderRelevanceScore),
    actionability_score: Math.round(actionabilityScore),
    novelty_score: Math.round(noveltyScore),
    impact_score: Math.round(impactScore),
    content_quality_score: Math.round(contentQualityScore),
    dedupe_confidence: candidate.dedupe_confidence ?? 1,
    penalties,
    ranking_reason: buildRankingReason(authorityTier, qualityScore, penalties),
    source_pool_id: candidate.source_pool_id ?? null,
    authority_tier: authorityTier,
    canonical_id: candidate.canonical_id ?? null
  };
}

function keywordScore(text, terms) {
  const hits = terms.filter((term) => text.includes(term)).length;
  return clamp(35 + hits * 13);
}

function buildRankingReason(authorityTier, qualityScore, penalties) {
  const authority = authorityTier === "S" ? "authoritative primary source" : `tier ${authorityTier} source`;
  const penaltyText = penalties.length ? ` with penalties: ${penalties.join(", ")}` : "";
  return `Selected from ${authority}; quality score ${qualityScore}${penaltyText}.`;
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}
```

- [ ] **Step 4: Run scoring tests**

Run:

```bash
node --test tests/feed-quality/scoring.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/feed-quality/scoring.mjs tests/feed-quality/scoring.test.mjs
git commit -m "Add deterministic signal scoring"
```

---

### Task 5: Quality Report Aggregator

**Files:**
- Create: `lib/feed-quality/report.mjs`
- Test: `tests/feed-quality/report.test.mjs`

- [ ] **Step 1: Write failing report tests**

Create `tests/feed-quality/report.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { buildQualityReport } from "../../lib/feed-quality/report.mjs";

test("buildQualityReport records accepted, rejected, and category gaps", () => {
  const report = buildQualityReport({
    date: "2026-06-10",
    categories: ["coding_ai", "image_ai"],
    duplicateGroups: [{ canonical_id: "url:https://example.com/a", count: 2 }],
    scoredItems: [
      { id: "a", category: "coding_ai", quality_score: 80, source_pool_id: "openai_blog", authority_tier: "S", penalties: [] },
      { id: "b", category: "image_ai", quality_score: 50, source_pool_id: "community", authority_tier: "C", penalties: ["community_source_requires_verification"] }
    ],
    minQualityScore: 65
  });

  assert.equal(report.accepted_count, 1);
  assert.equal(report.rejected_count, 1);
  assert.equal(report.coverage_gaps.length, 1);
  assert.equal(report.coverage_gaps[0].category, "image_ai");
  assert.equal(report.duplicate_groups.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/feed-quality/report.test.mjs
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement report builder**

Create `lib/feed-quality/report.mjs`:

```js
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
    else perSource[key].rejected += 1;
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
    top_rejected: rejected
      .toSorted((a, b) => b.quality_score - a.quality_score)
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

  return `${lines.join("\n")}\n`;
}
```

- [ ] **Step 4: Run report tests**

Run:

```bash
node --test tests/feed-quality/report.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/feed-quality/report.mjs tests/feed-quality/report.test.mjs
git commit -m "Add feed quality reporting"
```

---

### Task 6: Quality Report CLI

**Files:**
- Create: `scripts/generate-quality-report.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add quality report CLI**

Create `scripts/generate-quality-report.mjs`:

```js
#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadSourcePool } from "../lib/feed-quality/source-pool.mjs";
import { canonicalizeCandidates } from "../lib/feed-quality/canonicalize.mjs";
import { scoreCandidate } from "../lib/feed-quality/scoring.mjs";
import { buildQualityReport, renderQualityReportMarkdown } from "../lib/feed-quality/report.mjs";

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
    authority_tier: item.authority_tier ?? source?.authority_tier ?? "B"
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
```

- [ ] **Step 2: Add package script**

Modify `package.json` scripts:

```json
{
  "quality-report": "node scripts/generate-quality-report.mjs"
}
```

Keep existing scripts unchanged.

- [ ] **Step 3: Run quality report against an existing feed**

Run:

```bash
npm run quality-report -- --date=2026-05-28
```

Expected:

```text
Generated quality report for 2026-05-28
accepted=<number> rejected=<number> gaps=<number>
```

Verify:

```bash
test -f reports/feed-quality/2026-05-28.json
test -f reports/feed-quality/2026-05-28.md
```

Expected: both commands exit with status 0.

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/generate-quality-report.mjs reports/feed-quality/2026-05-28.json reports/feed-quality/2026-05-28.md
git commit -m "Add feed quality report CLI"
```

---

### Task 7: Full Verification

**Files:**
- Modify only if earlier tasks require small fixes.

- [ ] **Step 1: Run source pool validation**

Run:

```bash
npm run validate-source-pool
```

Expected: validation passes with 7 categories and at least 69 sources.

- [ ] **Step 2: Run all quality tests**

Run:

```bash
npm run test:quality
```

Expected: all tests pass.

- [ ] **Step 3: Run existing feed validation**

Run:

```bash
npm run validate-feed -- --date=2026-05-28 --min-source-images=0
```

Expected: existing feed validation passes.

- [ ] **Step 4: Generate quality report**

Run:

```bash
npm run quality-report -- --date=2026-05-28
```

Expected: report files are written under `reports/feed-quality/`.

- [ ] **Step 5: Inspect git status**

Run:

```bash
git status --short
```

Expected: only intended files are modified or untracked.

- [ ] **Step 6: Commit final verification fixes**

If Task 7 required edits:

```bash
git add <changed-files>
git commit -m "Verify signal quality tooling"
```

If Task 7 required no edits, do not create an empty commit.

---

## Plan Self-Review

- Spec coverage: source pool loader, validator, canonical dedupe, deterministic scoring, and quality report are each represented by a task.
- Scope: this plan intentionally does not modify UI, add a database, or replace `scripts/generate-feed.mjs`.
- Compatibility: existing feed fields remain valid; ranking fields are optional and produced in reports first.
- Test strategy: all new logic has deterministic unit tests using Node built-in `node:test`.
- Execution risk: first report maps current feed `source_name` to source pool entries by exact lowercase name. Unknown current sources fall back to tier `B`, so report generation still works while surfacing weaker source metadata.
