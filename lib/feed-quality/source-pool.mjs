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
