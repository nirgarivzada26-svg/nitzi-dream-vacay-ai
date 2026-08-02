// Recently viewed deals — client-only, stores deal IDs (never duplicated
// package records). The catalog is always the single source of truth: we
// re-resolve each id through getDeal() when rendering.

import { useSyncExternalStore } from "react";

const KEY = "nitzi:recently-viewed";
const LIMIT = 12;
const EMPTY: string[] = [];

let state: string[] = load();
const listeners = new Set<() => void>();

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* non-critical */
  }
  listeners.forEach((l) => l());
}

export function recordViewedDeal(dealId: string) {
  if (!dealId) return;
  state = [dealId, ...state.filter((id) => id !== dealId)].slice(0, LIMIT);
  persist();
}

export function useRecentlyViewed(): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => EMPTY,
  );
}
