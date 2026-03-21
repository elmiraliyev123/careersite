"use client";

import { useEffect, useState } from "react";

export type SavedJobItem = {
  slug: string;
  title: string;
  companySlug: string;
  companyName: string;
  companyLogo: string;
  sourceUrl?: string;
};

const SAVED_KEY = "careerapple.savedJobs";
const APPLIED_KEY = "careerapple.appliedJobs";
const EVENT_NAME = "careerapple.activityChanged";

function readStringArray(key: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function normalizeSavedItem(item: unknown): SavedJobItem | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const candidate = item as Partial<SavedJobItem>;

  if (
    typeof candidate.slug !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.companySlug !== "string" ||
    typeof candidate.companyName !== "string" ||
    typeof candidate.companyLogo !== "string"
  ) {
    return null;
  }

  return {
    slug: candidate.slug,
    title: candidate.title,
    companySlug: candidate.companySlug,
    companyName: candidate.companyName,
    companyLogo: candidate.companyLogo,
    sourceUrl: typeof candidate.sourceUrl === "string" ? candidate.sourceUrl : undefined
  };
}

function readSavedItems(): SavedJobItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    if (parsed.every((item) => typeof item === "string")) {
      return parsed.map((slug) => ({
        slug,
        title: slug,
        companySlug: slug,
        companyName: slug,
        companyLogo: ""
      }));
    }

    return parsed.map(normalizeSavedItem).filter((item): item is SavedJobItem => Boolean(item));
  } catch {
    return [];
  }
}

function broadcastChange() {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

function writeSavedItems(items: SavedJobItem[]) {
  window.localStorage.setItem(SAVED_KEY, JSON.stringify(items));
  broadcastChange();
}

function writeAppliedJobs(values: string[]) {
  window.localStorage.setItem(APPLIED_KEY, JSON.stringify(values));
  broadcastChange();
}

export function useCandidateActivity() {
  const [savedItems, setSavedItems] = useState<SavedJobItem[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);

  useEffect(() => {
    function sync() {
      setSavedItems(readSavedItems());
      setAppliedJobs(readStringArray(APPLIED_KEY));
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT_NAME, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT_NAME, sync);
    };
  }, []);

  function isSaved(slug: string) {
    return savedItems.some((item) => item.slug === slug);
  }

  function isApplied(slug: string) {
    return appliedJobs.includes(slug);
  }

  function toggleSavedJob(item: SavedJobItem) {
    const current = readSavedItems();
    const next = current.some((savedItem) => savedItem.slug === item.slug)
      ? current.filter((savedItem) => savedItem.slug !== item.slug)
      : [item, ...current];

    writeSavedItems(next);
  }

  function applyToJob(slug: string) {
    const current = readStringArray(APPLIED_KEY);

    if (current.includes(slug)) {
      return;
    }

    writeAppliedJobs([slug, ...current]);
  }

  return {
    savedItems,
    savedJobs: savedItems.map((item) => item.slug),
    appliedJobs,
    isSaved,
    isApplied,
    toggleSavedJob,
    applyToJob
  };
}
