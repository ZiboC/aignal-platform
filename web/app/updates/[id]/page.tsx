import { notFound } from "next/navigation";
import { DetailClient } from "@/components/detail-client";
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

  return <DetailClient item={rawItem} />;
}
