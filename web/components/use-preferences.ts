"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Language } from "@/lib/types";

const languageKey = "aignal.web.language";
const savedKey = "aignal.web.savedIds";
const languageChangeEvent = "aignal:language-changed";
const savedChangeEvent = "aignal:saved-changed";

function subscribeToPreference(key: string, eventName: string, callback: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === key) callback();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(eventName, callback);
  };
}

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "zh";
  const stored = window.localStorage.getItem(languageKey);
  return stored === "zh" || stored === "en" ? stored : "zh";
}

function getStoredSavedIds() {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(savedKey) ?? "[]";
}

export function useLanguage() {
  const language = useSyncExternalStore<Language>(
    (callback) => subscribeToPreference(languageKey, languageChangeEvent, callback),
    getStoredLanguage,
    () => "zh"
  );

  function setLanguage(value: Language) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(languageKey, value);
      window.dispatchEvent(new CustomEvent(languageChangeEvent));
    }
  }

  return { language, setLanguage };
}

export function useSavedIds() {
  const savedIdsSnapshot = useSyncExternalStore(
    (callback) => subscribeToPreference(savedKey, savedChangeEvent, callback),
    getStoredSavedIds,
    () => "[]"
  );

  const savedIds = useMemo(() => {
    try {
      const parsed = JSON.parse(savedIdsSnapshot);
      if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === "string");
    } catch {
      return [];
    }
    return [];
  }, [savedIdsSnapshot]);

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  function toggleSaved(id: string) {
    const next = savedIds.includes(id) ? savedIds.filter((item) => item !== id) : [id, ...savedIds];
    if (typeof window !== "undefined") {
      window.localStorage.setItem(savedKey, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(savedChangeEvent));
    }
  }

  return { savedIds, savedSet, toggleSaved };
}
