import {
  Binary,
  BriefcaseBusiness,
  Clapperboard,
  Images,
  Microscope,
  PackageOpen,
  WandSparkles
} from "lucide-react";
import type { Language, NewsCategory } from "./types";

export const categories: Array<{ id: NewsCategory; zh: string; en: string }> = [
  { id: "coding_ai", zh: "写代码 AI", en: "Coding AI" },
  { id: "image_ai", zh: "图片 AI", en: "Image AI" },
  { id: "video_ai", zh: "视频 AI", en: "Video AI" },
  { id: "research_papers", zh: "研究论文", en: "Research" },
  { id: "models_products", zh: "模型/产品", en: "Models" },
  { id: "business_investment", zh: "产业/投资", en: "Business" },
  { id: "tools_apps", zh: "工具应用", en: "Tools" }
];

export function categoryLabel(category: NewsCategory, language: Language) {
  const match = categories.find((item) => item.id === category);
  if (!match) return category;
  return language === "zh" ? match.zh : match.en;
}

export function CategoryIcon({ category, size = 16, className }: { category: NewsCategory; size?: number; className?: string }) {
  switch (category) {
    case "coding_ai":
      return <Binary size={size} className={className} />;
    case "image_ai":
      return <Images size={size} className={className} />;
    case "video_ai":
      return <Clapperboard size={size} className={className} />;
    case "research_papers":
      return <Microscope size={size} className={className} />;
    case "business_investment":
      return <BriefcaseBusiness size={size} className={className} />;
    case "tools_apps":
      return <WandSparkles size={size} className={className} />;
    case "models_products":
    default:
      return <PackageOpen size={size} className={className} />;
  }
}
