// Stub authentication layer — will be replaced in Wave 2 with real Supabase auth
// (Email + Google Sign-In). All storage is localStorage-based; anything relying
// on this module should treat the API as final so the swap is transparent.

export interface NitziUser {
  id: string;
  name: string;
  email: string;
  provider: "email" | "google";
  createdAt: string;
  notifications: {
    deals: boolean;
    sms: boolean;
    email: boolean;
    push: boolean;
  };
}

const KEY = "nitzi:user";
type Listener = (u: NitziUser | null) => void;
const listeners = new Set<Listener>();

function safeRead(): NitziUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as NitziUser) : null;
  } catch {
    return null;
  }
}

function emit(u: NitziUser | null) {
  listeners.forEach((l) => {
    try { l(u); } catch {}
  });
}

export function getUser(): NitziUser | null {
  return safeRead();
}

export function isAuthenticated(): boolean {
  return !!safeRead();
}

export function signInWithEmail(email: string, name?: string): NitziUser {
  const user: NitziUser = {
    id: "u_" + Math.random().toString(36).slice(2, 10),
    name: name?.trim() || email.split("@")[0],
    email: email.trim().toLowerCase(),
    provider: "email",
    createdAt: new Date().toISOString(),
    notifications: { deals: false, sms: false, email: false, push: false },
  };
  localStorage.setItem(KEY, JSON.stringify(user));
  emit(user);
  return user;
}

export function signInWithGoogle(): NitziUser {
  const user: NitziUser = {
    id: "g_" + Math.random().toString(36).slice(2, 10),
    name: "Google User",
    email: "you@gmail.com",
    provider: "google",
    createdAt: new Date().toISOString(),
    notifications: { deals: false, sms: false, email: false, push: false },
  };
  localStorage.setItem(KEY, JSON.stringify(user));
  emit(user);
  return user;
}

export function updateNotifications(prefs: Partial<NitziUser["notifications"]>) {
  const u = safeRead();
  if (!u) return null;
  u.notifications = { ...u.notifications, ...prefs };
  localStorage.setItem(KEY, JSON.stringify(u));
  emit(u);
  return u;
}

export function signOut() {
  localStorage.removeItem(KEY);
  emit(null);
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Intent preservation — remember where the user was headed so post-auth we can
// return them there. Real auth (Supabase) will use the same helpers.
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
