"use client";

import { useEffect, useMemo, useState } from "react";
import type { Language } from "@/lib/types";

const languageKey = "aignal.web.language";
const savedKey = "aignal.web.savedIds";

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "zh";
    const stored = window.localStorage.getItem(languageKey);
    if (stored === "zh" || stored === "en") return stored;
    return "zh";
  });

  function setLanguage(value: Language) {
    setLanguageState(value);
    window.localStorage.setItem(languageKey, value);
  }

  return { language, setLanguage };
}

export function useSavedIds() {
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(savedKey) ?? "[]");
      if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === "string");
    } catch {
      return [];
    }
    return [];
  });

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  function toggleSaved(id: string) {
    setSavedIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
      window.localStorage.setItem(savedKey, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("aignal:saved-changed", { detail: next }));
      return next;
    });
  }

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== savedKey) return;
      try {
        const parsed = JSON.parse(event.newValue ?? "[]");
        if (Array.isArray(parsed)) setSavedIds(parsed.filter((item) => typeof item === "string"));
      } catch {
        setSavedIds([]);
      }
    }

    function handleLocal(event: Event) {
      const detail = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) setSavedIds(detail);
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("aignal:saved-changed", handleLocal);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("aignal:saved-changed", handleLocal);
    };
  }, []);

  return { savedIds, savedSet, toggleSaved };
}
