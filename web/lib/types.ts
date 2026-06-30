export type Language = "zh" | "en";

export type NewsCategory =
  | "coding_ai"
  | "image_ai"
  | "video_ai"
  | "research_papers"
  | "models_products"
  | "business_investment"
  | "tools_apps";

export type FeedItem = {
  id: string;
  category: NewsCategory;
  title_zh: string;
  title_en: string;
  summary_zh: string;
  summary_en: string;
  why_it_matters_zh: string;
  why_it_matters_en: string;
  source_name: string;
  source_url: string | null;
  original_url: string | null;
  published_at: string;
  image_name: string;
  image_url?: string | null;
  image_source?: "source" | "generated" | null;
  image_prompt?: string | null;
  confidence?: number | null;
  tags: string[];
};

export type FeedArchive = {
  dates: string[];
  feedsByDate: Record<string, FeedItem[]>;
};

export type DisplayItem = {
  id: string;
  category: NewsCategory;
  title: string;
  summary: string;
  whyItMatters: string;
  sourceName: string;
  readingUrl: string | null;
  publishedAt: string;
  imageUrl: string | null;
  imageSource: FeedItem["image_source"];
  confidence: number | null;
  tags: string[];
};
