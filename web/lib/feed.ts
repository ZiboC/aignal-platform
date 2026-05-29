import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FeedArchive, FeedItem } from "./types";

const publicDir = path.join(process.cwd(), "public");

export async function getFeedArchive(): Promise<FeedArchive> {
  const index = JSON.parse(await readFile(path.join(publicDir, "feed", "index.json"), "utf8")) as {
    dates: string[];
  };
  const feedsByDate: Record<string, FeedItem[]> = {};

  for (const date of index.dates) {
    feedsByDate[date] = await getFeedByDate(date);
  }

  return {
    dates: index.dates,
    feedsByDate
  };
}

export async function getFeedByDate(date: string): Promise<FeedItem[]> {
  return JSON.parse(await readFile(path.join(publicDir, "feed", "daily", `${date}.json`), "utf8")) as FeedItem[];
}

export async function getAllFeedItems() {
  const archive = await getFeedArchive();
  const seen = new Set<string>();
  return archive.dates.flatMap((date) => {
    return archive.feedsByDate[date].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  });
}

export async function getFeedItem(id: string) {
  const items = await getAllFeedItems();
  return items.find((item) => item.id === id) ?? null;
}
