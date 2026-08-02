// Sharing a deal always points at the canonical package page (/deal/$id),
// so every entry point in the app shares the exact same record.

import type { Deal } from "@/lib/deals";

export function dealUrl(deal: Deal): string {
  const path = `/deal/${encodeURIComponent(deal.id)}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

/** Returns "shared" when the native sheet was used, "copied" when the link
 *  was copied to the clipboard, or "failed" when neither is available. */
export async function shareDeal(deal: Deal): Promise<"shared" | "copied" | "failed"> {
  const url = dealUrl(deal);
  const title = `${deal.destination.name} · ${deal.hotel.name} — NITZI`;
  const text = `${deal.dates.nights} לילות ב${deal.destination.name} מ־₪${Math.round(
    deal.price.perPerson,
  ).toLocaleString()} לאדם`;

  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
  } catch {
    // user cancelled or share unavailable — fall through to copy
  }

  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
