import type { DisplayItem, NewsCategory } from "./types";

export function filterItems(items: DisplayItem[], query: string, category: NewsCategory | "all") {
  const normalized = query.trim().toLowerCase();
  return items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (!normalized) return true;
    return [
      item.title,
      item.summary,
      item.whyItMatters,
      item.sourceName,
      item.category,
      ...item.tags
    ].some((value) => value.toLowerCase().includes(normalized));
  });
}
