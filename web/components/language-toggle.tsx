"use client";

import type { Language } from "@/lib/types";

type Props = {
  language: Language;
  setLanguage: (language: Language) => void;
};

export function LanguageToggle({ language, setLanguage }: Props) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-line bg-white p-1" aria-label="Language">
      {(["zh", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLanguage(value)}
          className={[
            "h-8 min-w-10 rounded px-2 text-xs font-bold transition",
            language === value ? "bg-ink text-white" : "text-muted hover:bg-panel"
          ].join(" ")}
        >
          {value === "zh" ? "中" : "EN"}
        </button>
      ))}
    </div>
  );
}
