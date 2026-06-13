# Aignal Signal Quality / Ranking Design

Date: 2026-06-10
Status: approved direction, ready for implementation planning

## Product Goal

Aignal is positioned as "AI 从业者每日必读": a daily signal product for AI builders, founders, product/engineering people, and investors who need fewer but higher-quality AI updates.

The ranking layer should not behave like a generic AI news feed. It should prefer signals that help a mixed AI builder decide what to read, test, adopt, monitor, or ignore.

## Approved Direction

Use a mixed scoring system:

- Rule-based scoring first, so the first version is transparent, debuggable, and does not depend on an LLM.
- Category-specific source pools, so every tag has professional sources matched to that field.
- Quality-first coverage, so missing categories produce a quality report gap instead of low-quality filler.
- Canonical dedupe before ranking, so repeated coverage of the same event becomes one stronger signal with supporting sources.

## Source Pool Model

The canonical registry lives in `data/source-pool.json`.

Each source has:

- `id`
- `name`
- `url`
- `category_ids`
- `authority_tier`
- `source_type`
- `access_method`
- `refresh_cadence`
- `verification_rule`

Authority tiers:

- `S`: primary authoritative sources, including official company pages, changelogs, official research pages, SEC/government sources, and formal publication venues.
- `A`: validation sources, including model hubs, benchmarks, leaderboards, and structured data platforms.
- `B`: discovery sources, including market intelligence, product discovery, app stores, GitHub trends, and startup databases.
- `C`: community discovery only; not accepted as a final factual source without verification.

NVIDIA is included as an `S`-tier source across relevant categories:

- `nvidia_newsroom`: models/products and business/investment.
- `nvidia_blog`: image AI, video AI, models/products, and business/investment.
- `nvidia_developer_blog`: coding AI, video AI, research papers, models/products, and tools/apps.
- `nvidia_research`: image AI, video AI, research papers, and models/products.

## Scoring Fields

Each candidate signal should receive a structured quality object before entering the final feed:

```json
{
  "quality_score": 0,
  "source_score": 0,
  "builder_relevance_score": 0,
  "actionability_score": 0,
  "novelty_score": 0,
  "impact_score": 0,
  "content_quality_score": 0,
  "dedupe_confidence": 0,
  "penalties": [],
  "ranking_reason": "",
  "source_pool_id": "",
  "authority_tier": "",
  "canonical_id": ""
}
```

Recommended first-version weights:

- `source_score`: 25%
- `builder_relevance_score`: 25%
- `impact_score`: 20%
- `actionability_score`: 15%
- `novelty_score`: 10%
- `content_quality_score`: 5%

Penalties should apply after weighted scoring.

## Quality Rules

Minimum acceptance:

- `quality_score >= 65` for normal feed inclusion.
- `authority_tier` must be `S`, `A`, or validated `B`.
- A `B` source must have a stronger official or structured verification link before being treated as a final signal.
- Duplicate or near-duplicate candidates must resolve into one canonical signal.

Recommended category targets:

- `target_per_category`: 2
- `soft_min_per_category`: 1
- `daily_total_target`: 18 to 24 signals

Quality-first exception:

- If a category has no item above threshold, do not force-fill it.
- Emit a `coverage_gap` item in the quality report with category id, attempted sources, best rejected score, and rejection reasons.

## Canonical Dedupe

Canonical grouping should run before ranking.

Signals should be grouped when they share enough of:

- Same source URL or canonical URL.
- Same original URL.
- Similar title after normalization.
- Same product/model/company/event/date.
- High overlap in named entities and tags.

When duplicates are found:

- Keep the most authoritative source as the primary source.
- Preserve supporting sources in `supporting_sources`.
- Merge tags and categories only when they describe the same underlying event.
- Do not create multiple archive cards for the same canonical event.

## Ranking Flow

1. Load `data/source-pool.json`.
2. Validate source and category references.
3. Collect candidates by category.
4. Normalize candidate fields.
5. Canonicalize and dedupe candidates.
6. Score canonical candidates.
7. Select category winners using quality-first coverage.
8. Apply global diversity controls.
9. Emit feed JSON.
10. Emit quality report JSON/Markdown.

## UI Contract

The existing feed schema should remain compatible with the web and iOS app. Ranking fields can be added as optional fields:

- `source_pool_id`
- `authority_tier`
- `quality_score`
- `ranking_reason`
- `canonical_id`
- `supporting_sources`

The web UI can later use these fields for:

- source quality labels,
- related signal dedupe,
- archive grouping,
- radar consistency,
- transparent "why this matters today" explanations.

## Quality Report

Each daily run should produce a report with:

- total candidates collected,
- accepted signal count,
- rejected candidate count,
- coverage by category,
- coverage gaps,
- duplicate groups,
- top rejected candidates with reasons,
- per-source contribution,
- warnings for stale or failed sources.

The report is internal first. It should not block publishing unless the feed is below a configured minimum quality threshold.

## First Implementation Boundary

The next implementation step should build tooling only:

- source pool loader,
- source pool validator,
- quality report skeleton,
- canonical dedupe helper,
- scoring helper with deterministic tests.

It should not redesign the UI, add a backend database, or replace the whole feed pipeline in one pass.

## Open Decisions For Later

- Whether to add an LLM judge after rule-based scoring is stable.
- Whether source quality labels should be visible to users or remain internal.
- Whether category quotas should change by weekday or by market event volume.
- Whether to maintain a manual "must include" override for major launches.
