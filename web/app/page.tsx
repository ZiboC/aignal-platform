import { DashboardClient } from "@/components/dashboard-client";
import { getFeedArchive } from "@/lib/feed";

export default async function HomePage() {
  const archive = await getFeedArchive();
  return <DashboardClient archive={archive} />;
}
