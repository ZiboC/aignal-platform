import { SavedClient } from "@/components/saved-client";
import { getAllFeedItems } from "@/lib/feed";

export default async function SavedPage() {
  const items = await getAllFeedItems();
  return <SavedClient items={items} />;
}
