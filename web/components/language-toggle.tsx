"use client";

import type { Language } from "@/lib/types";

type Props = {
  language: Language;
  setLanguage: (language: Language) => void;
};

export function LanguageToggle({ language, setLanguage }: Props) {
  return (
    <div
      className="grid grid-cols-2 overflow-hidden rounded-sm border border-white/25 bg-white/10 p-0.5 sm:p-1"
      aria-label="Language"
    >
      {(["zh", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLanguage(value)}
          aria-label={value === "zh" ? "切换为中文" : "Switch to English"}
          aria-pressed={language === value}
          title={value === "zh" ? "中文" : "English"}
          className={[
            "h-8 min-w-8 rounded-sm px-1.5 text-[11px] font-black uppercase transition sm:min-w-10 sm:px-2 sm:text-xs",
            language === value ? "bg-signal text-obsidian" : "text-muted hover:bg-source/12 hover:text-source"
          ].join(" ")}
        >
          {value === "zh" ? "中" : "EN"}
        </button>
      ))}
    </div>
  );
}
