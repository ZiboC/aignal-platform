import { readFile } from "node:fs/promises";
import path from "node:path";

export type SourceHealthReport = {
  checked_at: string;
  summary: {
    total_sources: number;
    checked_sources: number;
    reachable_sources: number;
    failing_sources: number;
    directly_collectable_sources: number;
    adapter_needed_sources: number;
    status_counts: Record<string, number>;
    access_method_counts: Record<string, number>;
  };
  coverage_gaps: Array<{
    category_id: string;
    label_zh: string;
    label_en: string;
    reason: string;
  }>;
  adapter_gaps: Array<{
    category_id: string;
    label_zh: string;
    label_en: string;
    reason: string;
  }>;
  categories: Array<{
    id: string;
    label_zh: string;
    label_en: string;
    source_count: number;
    reachable_count: number;
    failing_count: number;
    directly_collectable_count: number;
    adapter_needed_count: number;
    coverage_status: string;
    failing_source_ids: string[];
    adapter_needed_source_ids: string[];
  }>;
  sources: Array<{
    id: string;
    name: string;
    url: string;
    final_url: string | null;
    category_ids: string[];
    authority_tier: string;
    access_method: string;
    collection_status: string;
    health_status: string;
    ok: boolean;
    status: number | null;
    elapsed_ms: number | null;
    error: string | null;
  }>;
};

export async function getSourceHealthReport(): Promise<SourceHealthReport | null> {
  try {
    const reportPath = path.join(process.cwd(), "..", "reports", "source-health", "latest.json");
    return JSON.parse(await readFile(reportPath, "utf8")) as SourceHealthReport;
  } catch {
    return null;
  }
}
