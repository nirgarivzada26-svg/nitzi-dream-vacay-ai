// Modular data-provider layer.
// The UI never imports mock data directly — it goes through these interfaces.
// To connect a real API (Booking, Skyscanner, Amadeus, Google Maps, …)
// implement the interfaces and register the provider in ./registry.ts.

import type { QuizAnswers } from "@/lib/nitzi-data";
import type { Destination } from "@/lib/catalog";

export interface SearchContext {
  answers: QuizAnswers;
  destination: Destination;
  origin?: string;
  startDate?: string;
  endDate?: string;
}

export interface Hotel {
  id: string;
  name: string;
  image?: string;
  stars: number; // 1-5
  guestRating: number; // 0-10
  reviewsCount: number;
  pricePerNight: number; // ILS
  currency: "ILS";
  location: string;
  distanceToCenterKm?: number;
  distanceToBeachKm?: number;
  amenities: string[]; // "pool" | "spa" | "parking" | "breakfast" | "gym" | "wifi" | "beachfront" | "family" | "adults-only"
  source: string; // provider id (e.g. "mock", "booking")
  deeplink?: string;
}

export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departAt: string; // ISO
  arriveAt: string; // ISO
  durationMinutes: number;
  stops: number;
  price: number; // ILS, per person
  currency: "ILS";
  source: string;
  deeplink?: string;
}

export interface Package {
  id: string;
  title: string;
  hotel: Hotel;
  flight: Flight;
  nights: number;
  totalPrice: number; // ILS, total for all travellers
  separatePrice: number; // ILS, hypothetical unbundled price
  savings: number; // separate - total
  includes: string[];
  rating: number; // 0-10
  source: string;
}

export interface HotelProvider {
  id: string;
  search(ctx: SearchContext, opts?: { limit?: number }): Promise<Hotel[]>;
}
export interface FlightProvider {
  id: string;
  search(ctx: SearchContext, opts?: { limit?: number }): Promise<Flight[]>;
}
export interface PackageProvider {
  id: string;
  search(ctx: SearchContext, opts?: { limit?: number }): Promise<Package[]>;
}
