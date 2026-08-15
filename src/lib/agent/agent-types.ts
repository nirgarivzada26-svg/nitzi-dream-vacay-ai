// Shared, client-safe types for the NITZI AI agent.
// The chat route (server) produces these; the chat UI (client) renders them.

import type { BoardBasis } from "@/lib/deals";
import type { CancellationPolicy } from "@/lib/cancellation-policy";
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

  // --- Context-only fields (Slice 4) ---
  // These are stored and shown back to the user, but the catalog/provider
  // data cannot genuinely support filtering on them today, so they are
  // NEVER passed to passesFilters()/any elimination logic. See
  // agent-search.server.ts for exactly why each one can't filter yet.
  /** Free-text date/month request, e.g. "אוגוסט". Not parsed into a real range. */
  requestedDates: string | null;
  dateFlexibility: "fixed" | "flexible" | "very-flexible" | null;
  /** Ages of travelling children. Ephemeral — never persisted to any table. */
  childrenAges: number[] | null;
  baggagePreference: "checked" | "carry-on-only" | null;
}

/** Same shape as AgentFilters — named separately for the "what NITZI knows"
 *  UI layer, so it reads clearly as a snapshot of extracted preferences
 *  rather than a search-tool input. */
export type KnownPreferences = AgentFilters;

export interface AgentFlightLeg {
  airline: string;
  flightNumber: string;
  departAt: string;
  arriveAt: string;
  stops: number;
  durationMinutes: number;
}

export interface AgentRecommendation {
  /** Either a demo catalog id or a full canonical id (sourceMode:providerId:providerOfferId) — /deal/:id routes either correctly. */
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
  /** "unknown" for a LIVE/SANDBOX offer whose board basis the provider layer doesn't expose — never guessed. */
  board: BoardBasis | "unknown";
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
  /** Single source of truth — see src/lib/cancellation-policy.ts. */
  cancellationPolicy: CancellationPolicy;
  outbound: AgentFlightLeg;
  inbound: AgentFlightLeg | null;
  nitziScore: number;
  smartPrice: { level: SmartPriceLevel; label: string; detail: string; emoji: string } | null;
  reasons: string[];
  note: string | null;

  // --- Slice 4 additions ---
  /** Single strongest real reason to pick this deal — deterministic, from real facts. */
  advantage: string | null;
  /** Single most notable real trade-off of this deal — deterministic, from real facts. */
  compromise: string | null;
  /** id of a cheaper option — ONLY ever set to an id present in the same search's returned recommendations. */
  cheaperAlternativeDealId: string | null;
  /** id of a higher-rated option — ONLY ever set to an id present in the same search's returned recommendations. */
  betterAlternativeDealId: string | null;

  // --- AI searchTrips Canonical Offer migration additions ---
  /** Full canonical id (sourceMode:providerId:providerOfferId) — same value as dealId today, kept explicit for clarity/future use. */
  canonicalId: string | null;
  sourceMode: "demo" | "sandbox" | "live";
  providerId: string | null;
  providerOfferId: string | null;
  /** From CanonicalOffer.availabilityState — "available" | "limited" | "unavailable" | "unverified" — never fabricated. */
  availabilityState: string | null;
  /** Destination tags (beach/family/etc.) — our own catalog metadata, source-independent. */
  tags: string[];
}

export interface AgentSearchResult {
  count: number;
  filtersUsed: AgentFilters;
  recommendations: AgentRecommendation[];
  /** Set when nothing in the catalog matched — never invent an alternative. */
  emptyReason: string | null;
  /**
   * Set only when relaxation-probing proved that removing exactly one
   * constraint would produce real matches — never a guess. See
   * diagnoseBlockingConstraint() in agent-search.server.ts.
   */
  blockingConstraint: RelaxationSuggestion | null;
}

export interface RelaxationSuggestion {
  field: "directOnly" | "board" | "minStars" | "maxBudgetPerPerson" | "nights";
  message: string;
  suggestion: string;
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
  /** Set only when the evidence was too incomplete to declare a winner — never omitted silently. */
  note: string | null;
}

export const AGENT_TOOL_NAMES = [
  "searchTrips",
  "buildTrip",
  "compareTrips",
  "listCatalog",
  "updateKnownPreferences",
] as const;
