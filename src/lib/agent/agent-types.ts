// Shared, client-safe types for the NITZI AI agent.
// The chat route (server) produces these; the chat UI (client) renders them.

import type { BoardBasis } from "@/lib/deals";
import type { SmartPriceLevel } from "@/lib/smart-price";
import type { TripStyle, TripType } from "@/lib/nitzi-data";

export interface AgentFilters {
  /** Destination names or slugs from the catalog. */
  destinations: string[] | null;
  countries: string[] | null;
  tripType: TripType | null;
  style: TripStyle | null;
  maxBudgetPerPerson: number | null;
  nights: number | null;
  people: number | null;
  minStars: number | null;
  board: BoardBasis | null;
  directOnly: boolean | null;
  /** "pool" | "beach" | "all-inclusive" | "free-cancellation" */
  musts: string[] | null;
  /** destinations the user already rejected */
  exclude: string[] | null;
}

export interface AgentFlightLeg {
  airline: string;
  flightNumber: string;
  departAt: string;
  arriveAt: string;
  stops: number;
  durationMinutes: number;
}

export interface AgentRecommendation {
  /** Catalog deal id — used for /deal/$id, favorites and compare. */
  dealId: string | null;
  kind: "package" | "built";
  destination: string;
  destinationSlug: string;
  country: string;
  emoji: string;
  image: string | null;
  hotelName: string;
  hotelStars: number;
  guestRating: number;
  board: BoardBasis;
  nights: number;
  people: number;
  startDate: string;
  endDate: string;
  pricePerPerson: number;
  totalPrice: number;
  currency: "ILS";
  availability: string;
  verifiedAt: string;
  source: string;
  freeCancellation: boolean;
  outbound: AgentFlightLeg;
  inbound: AgentFlightLeg | null;
  nitziScore: number;
  smartPrice: { level: SmartPriceLevel; label: string; detail: string; emoji: string } | null;
  reasons: string[];
  note: string | null;
}

export interface AgentSearchResult {
  count: number;
  filtersUsed: AgentFilters;
  recommendations: AgentRecommendation[];
  /** Set when nothing in the catalog matched — never invent an alternative. */
  emptyReason: string | null;
}

export interface AgentComparisonRow {
  label: string;
  values: string[];
}

export interface AgentComparison {
  items: { dealId: string; title: string; destination: string }[];
  rows: AgentComparisonRow[];
  bestValueDealId: string | null;
  bestHotelDealId: string | null;
  cheapestDealId: string | null;
}

export const AGENT_TOOL_NAMES = [
  "searchTrips",
  "buildTrip",
  "compareTrips",
  "listCatalog",
] as const;
