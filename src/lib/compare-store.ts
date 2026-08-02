// Tiny compare store — no zustand dependency. Uses useSyncExternalStore.
import { useSyncExternalStore } from "react";

export type CompareKind = "hotel" | "package";
export interface CompareEntry {
  id: string;
  kind: CompareKind;
}

const KEY = "nitzi:compare";
const EMPTY: CompareEntry[] = [];
let state: CompareEntry[] = load();
const listeners = new Set<() => void>();

function load(): CompareEntry[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function persist() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* non-critical */
  }
  listeners.forEach((l) => l());
}

export function toggleCompare(entry: CompareEntry) {
  const exists = state.some((e) => e.id === entry.id && e.kind === entry.kind);
  if (exists) state = state.filter((e) => !(e.id === entry.id && e.kind === entry.kind));
  else {
    // limit to 4 & same kind only
    const sameKind = state.filter((e) => e.kind === entry.kind);
    state = [...sameKind, entry].slice(-4);
  }
  persist();
}
export function clearCompare() {
  state = [];
  persist();
}
export function isCompared(id: string, kind: CompareKind) {
  return state.some((e) => e.id === id && e.kind === kind);
}

export function useCompare() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => EMPTY,
  );
}
