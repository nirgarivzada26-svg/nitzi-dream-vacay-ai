// Client-side data helpers backed by Supabase (RLS enforces per-user isolation).
// UI never touches supabase.from() directly — always goes through these
// helpers so the storage layer can be swapped later without touching UI.

import { supabase } from "@/integrations/supabase/client";
import type { Deal } from "@/lib/deals";
import type { QuizAnswers } from "@/lib/nitzi-data";

export interface FavoriteRow {
  id: string;
  deal_id: string;
  destination_name: string;
  snapshot: Deal;
  created_at: string;
}

export interface SavedTripRow {
  id: string;
  title: string;
  destination_name: string;
  answers: QuizAnswers;
  snapshot: unknown;
  created_at: string;
}

export interface BookingRow {
  id: string;
  deal_id: string;
  destination_name: string;
  people: number;
  nights: number;
  price_per_person: number;
  total_price: number;
  currency: string;
  start_date: string;
  end_date: string;
  status: string;
  /** 'paid' | 'demo' | 'failed' — see the payment_status migration (Slice 1). */
  payment_status: string;
  snapshot: Deal;
  created_at: string;
}

export interface SearchHistoryRow {
  id: string;
  answers: QuizAnswers;
  destination_name: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  deals: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

// Favorites
export async function listFavorites(): Promise<FavoriteRow[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FavoriteRow[];
}
export async function isDealFavorited(dealId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("deal_id", dealId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}
export async function addFavorite(deal: Deal): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  const { error } = await supabase.from("favorites").insert({
    user_id: user.id,
    deal_id: deal.id,
    destination_name: deal.destination.name,
    snapshot: deal as unknown as never,
  });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}
export async function removeFavorite(dealId: string): Promise<void> {
  const { error } = await supabase.from("favorites").delete().eq("deal_id", dealId);
  if (error) throw error;
}

// Saved trips
export async function listSavedTrips(): Promise<SavedTripRow[]> {
  const { data, error } = await supabase
    .from("saved_trips")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SavedTripRow[];
}
export async function saveTrip(input: {
  title: string;
  destinationName: string;
  answers: QuizAnswers;
  snapshot: unknown;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  const { error } = await supabase.from("saved_trips").insert({
    user_id: user.id,
    title: input.title,
    destination_name: input.destinationName,
    answers: input.answers as unknown as never,
    snapshot: input.snapshot as unknown as never,
  });
  if (error) throw error;
}
export async function deleteSavedTrip(id: string): Promise<void> {
  const { error } = await supabase.from("saved_trips").delete().eq("id", id);
  if (error) throw error;
}

// Bookings
export async function listBookings(): Promise<BookingRow[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BookingRow[];
}
// Bookings are created exclusively by the server (src/lib/bookings.functions.ts),
// which recomputes the price from the catalog. The browser can only read them.

// Search history
export async function logSearch(answers: QuizAnswers, destinationName?: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // silent no-op when guest
  await supabase.from("search_history").insert({
    user_id: user.id,
    answers: answers as unknown as never,
    destination_name: destinationName ?? null,
  });
}
export async function listSearchHistory(): Promise<SearchHistoryRow[]> {
  const { data, error } = await supabase
    .from("search_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as SearchHistoryRow[];
}
export async function clearSearchHistory(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("search_history").delete().eq("user_id", user.id);
}

// Notification preferences
export async function getNotifPrefs(): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("deals, email, sms, push")
    .maybeSingle();
  return (data ?? {
    deals: false,
    email: false,
    sms: false,
    push: false,
  }) as NotificationPreferences;
}
export async function updateNotifPrefs(prefs: Partial<NotificationPreferences>): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      ...prefs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

// Profile
export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}
export async function getProfile(): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .maybeSingle();
  return (data ?? null) as ProfileRow | null;
}
export async function updateProfile(patch: {
  display_name?: string;
  avatar_url?: string;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  const { error } = await supabase.from("profiles").upsert({ id: user.id, ...patch });
  if (error) throw error;
}
