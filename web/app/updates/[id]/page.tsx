import { notFound } from "next/navigation";
import { DetailClient } from "@/components/detail-client";
import { dedupeSignals, getCanonicalSignalKey } from "@/lib/dedupe";
import { getAllFeedItems, getFeedItem } from "@/lib/feed";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const items = await getAllFeedItems();
  return items.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const item = await getFeedItem(id);
  if (!item) return {};
  return {
    title: `${item.title_zh} | Aignal`,
    description: item.summary_zh
  };
}

export default async function UpdatePage({ params }: Props) {
  const { id } = await params;
  const rawItem = await getFeedItem(id);
  if (!rawItem) notFound();
  const allItems = await getAllFeedItems();
  const itemDate = rawItem.published_at.slice(0, 10);
  const rawItemKey = getCanonicalSignalKey(rawItem);
  const relatedItems = dedupeSignals(
    allItems
      .filter((item) => item.id !== rawItem.id && getCanonicalSignalKey(item) !== rawItemKey)
      .sort((a, b) => {
        const aScore = (a.category === rawItem.category ? 2 : 0) + (a.published_at.slice(0, 10) === itemDate ? 1 : 0);
        const bScore = (b.category === rawItem.category ? 2 : 0) + (b.published_at.slice(0, 10) === itemDate ? 1 : 0);
        return bScore - aScore || Date.parse(b.published_at) - Date.parse(a.published_at);
      })
  ).slice(0, 3);

  return <DetailClient item={rawItem} relatedItems={relatedItems} />;
}
