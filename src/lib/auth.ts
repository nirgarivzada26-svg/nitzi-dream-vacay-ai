// Real Supabase-backed auth wrapper. Keeps the previous stub's API surface
// (subscribe / isAuthenticated / setAuthIntent / consumeAuthIntent / signOut)
// so components that already used it don't have to change import paths.
//
// Sign-in itself lives in the SignInModal (Google popup) and /auth page
// (magic link) — we go through Supabase directly there.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const INTENT_KEY = "nitzi:auth-intent";

export function setAuthIntent(path: string) {
  try { sessionStorage.setItem(INTENT_KEY, path); } catch {}
}
export function consumeAuthIntent(): string | null {
  try {
    const v = sessionStorage.getItem(INTENT_KEY);
    if (v) sessionStorage.removeItem(INTENT_KEY);
    return v;
  } catch { return null; }
}

export async function signOut() {
  await supabase.auth.signOut();
}

// A tiny hook every UI surface uses. React-friendly, so we don't have to
// polyfill a manual subscribe map like the stub did.
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return { user, loading, isAuthenticated: !!user };
}

// Nice display name (from profile metadata; falls back to email prefix).
export function displayNameOf(u: User | null | undefined): string {
  if (!u) return "";
  const meta = (u.user_metadata ?? {}) as { name?: string; full_name?: string; display_name?: string };
  return meta.display_name || meta.name || meta.full_name || (u.email ? u.email.split("@")[0] : "משתמש");
}
