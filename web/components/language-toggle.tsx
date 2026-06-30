"use client";

import type { Language } from "@/lib/types";

type Props = {
  language: Language;
  setLanguage: (language: Language) => void;
};

export function LanguageToggle({ language, setLanguage }: Props) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-sm border border-white/25 bg-white/10 p-1" aria-label="Language">
      {(["zh", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLanguage(value)}
          className={[
            "h-8 min-w-10 rounded-sm px-2 text-xs font-black uppercase transition",
            language === value ? "bg-signal text-obsidian" : "text-muted hover:bg-source/12 hover:text-source"
          ].join(" ")}
        >
          {value === "zh" ? "中" : "EN"}
        </button>
      ))}
    </div>
  );
}
