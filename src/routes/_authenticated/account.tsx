// The personal area — tabs for bookings, saved trips, favorites, search history,
// notification preferences, and profile settings.

import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft, Bell, BookmarkCheck, Calendar, Heart, History, LogOut, MapPin, Settings, Sparkles, Trash2, User as UserIcon,
} from "lucide-react";
import { NitziLogo } from "@/components/NitziLogo";
import { DestinationImage } from "@/components/DestinationImage";
import { displayNameOf, signOut, useAuth } from "@/lib/auth";
import {
  clearSearchHistory, deleteSavedTrip, getNotifPrefs, getProfile, listBookings,
  listFavorites, listSavedTrips, listSearchHistory, removeFavorite, updateNotifPrefs, updateProfile,
  type NotificationPreferences,
} from "@/lib/user-data";

const TABS = ["bookings", "trips", "favorites", "history", "notifications", "profile"] as const;
type TabId = (typeof TABS)[number];

const searchSchema = z.object({ tab: z.enum(TABS).optional() });

export const Route = createFileRoute("/_authenticated/account")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "האזור האישי — NITZI" },
      { name: "description", content: "הזמנות, חופשות שמורות, מועדפים, היסטוריית חיפוש והגדרות התראות." },
      { property: "og:title", content: "האזור האישי שלי ב-NITZI" },
      { property: "og:description", content: "כל החופשות שלך במקום אחד." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tab } = useSearch({ from: "/_authenticated/account" });
  const active: TabId = tab ?? "bookings";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-sand/50 via-background to-background pb-16">
      <header className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-5 pt-6 sm:px-8">
        <Link to="/" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <NitziLogo />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> התנתקות
        </button>
      </header>

      <section className="mx-auto mt-8 w-full max-w-[1600px] px-5 sm:px-8">
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-glow sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-sunset text-white shadow-glow">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">שלום 👋</div>
              <h1 className="text-2xl font-black text-foreground sm:text-3xl">{displayNameOf(user)}</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>
      </section>

      <nav className="mx-auto mt-6 flex w-full max-w-[1600px] gap-2 overflow-x-auto px-5 pb-2 sm:px-8">
        <TabLink id="bookings" active={active} label="הזמנות" icon={<Calendar className="h-3.5 w-3.5" />} />
        <TabLink id="trips" active={active} label="חופשות שמורות" icon={<BookmarkCheck className="h-3.5 w-3.5" />} />
        <TabLink id="favorites" active={active} label="מועדפים" icon={<Heart className="h-3.5 w-3.5" />} />
        <TabLink id="history" active={active} label="היסטוריה" icon={<History className="h-3.5 w-3.5" />} />
        <TabLink id="notifications" active={active} label="התראות" icon={<Bell className="h-3.5 w-3.5" />} />
        <TabLink id="profile" active={active} label="פרופיל" icon={<Settings className="h-3.5 w-3.5" />} />
      </nav>

      <section className="mx-auto mt-6 w-full max-w-[1600px] px-5 sm:px-8">
        {active === "bookings" && <BookingsTab />}
        {active === "trips" && <TripsTab />}
        {active === "favorites" && <FavoritesTab />}
        {active === "history" && <HistoryTab />}
        {active === "notifications" && <NotificationsTab />}
        {active === "profile" && <ProfileTab />}
      </section>
    </div>
  );
}

function TabLink({ id, label, active, icon }: { id: TabId; label: string; active: TabId; icon: React.ReactNode }) {
  const isActive = active === id;
  return (
    <Link
      to="/account"
      search={{ tab: id }}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-black transition ${
        isActive ? "bg-gradient-sunset text-white shadow-glow" : "border border-border bg-card text-foreground hover:bg-muted"
      }`}
    >
      {icon} {label}
    </Link>
  );
}

function EmptyState({ title, hint, cta }: { title: string; hint: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-sunset text-white shadow-glow">
        <Sparkles className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-black text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}

function BookingsTab() {
  const q = useQuery({ queryKey: ["bookings"], queryFn: listBookings });
  if (q.isLoading) return <SkeletonList />;
  if (!q.data?.length)
    return (
      <EmptyState title="עוד אין לך הזמנות" hint="ההזמנות שאתה מבצע דרך NITZI יופיעו כאן עם מספר אישור ופרטים מלאים."
        cta={<Link to="/" className="rounded-2xl bg-gradient-sunset px-4 py-2 text-sm font-black text-white shadow-glow">גלה דילים</Link>} />
    );
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {q.data.map((b) => (
        <div key={b.id} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-800">{b.status === "confirmed" ? "מאושר" : b.status}</span>
            <span className="text-[10px] font-mono text-muted-foreground">#{b.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <h3 className="mt-2 text-xl font-black text-foreground">{b.destination_name}</h3>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span><Calendar className="mr-0.5 inline h-3 w-3" /> {b.start_date} → {b.end_date}</span>
            <span>· {b.nights} לילות · {b.people} נוסעים</span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">סה״כ</div>
              <div className="text-2xl font-black text-foreground">₪{Math.round(Number(b.total_price)).toLocaleString()}</div>
            </div>
            <Link to="/deal/$id" params={{ id: b.deal_id }} className="rounded-2xl border border-border bg-card px-3 py-1.5 text-[11px] font-bold">פרטי הדיל</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function TripsTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["saved_trips"], queryFn: listSavedTrips });
  if (q.isLoading) return <SkeletonList />;
  if (!q.data?.length)
    return <EmptyState title="עדיין לא שמרת אף חופשה" hint="בעמוד התוצאות תוכל לשמור מסלול שלם וחזרת אליו מכאן."
      cta={<Link to="/ai" className="rounded-2xl bg-gradient-sunset px-4 py-2 text-sm font-black text-white shadow-glow">תכנן חופשה</Link>} />;
  return (
    <ul className="grid gap-3">
      {q.data.map((t) => (
        <li key={t.id} className="flex items-center justify-between rounded-3xl border border-border bg-card p-4 shadow-soft">
          <div>
            <h3 className="text-sm font-black text-foreground">{t.title}</h3>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" /> {t.destination_name}</div>
          </div>
          <button onClick={async () => { await deleteSavedTrip(t.id); qc.invalidateQueries({ queryKey: ["saved_trips"] }); }}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-rose-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function FavoritesTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["favorites"], queryFn: listFavorites });
  if (q.isLoading) return <SkeletonList />;
  if (!q.data?.length)
    return <EmptyState title="אין לך עדיין מועדפים" hint="בכל דיל לחץ על הלב כדי לשמור לרשימה שלך."
      cta={<Link to="/" className="rounded-2xl bg-gradient-sunset px-4 py-2 text-sm font-black text-white shadow-glow">גלה דילים</Link>} />;
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {q.data.map((f) => {
        const snap = f.snapshot;
        return (
          <div key={f.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
            <div className="relative h-48 w-full">
              <DestinationImage destination={snap.destination} className="h-full w-full object-cover" />
              <button onClick={async () => { await removeFavorite(f.deal_id); qc.invalidateQueries({ queryKey: ["favorites"] }); }}
                className="absolute top-2 left-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-rose-500">
                <Heart className="h-4 w-4 fill-current" />
              </button>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-black text-foreground">{f.destination_name}</h3>
              <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{snap.title}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-black text-foreground">₪{snap.price.perPerson.toLocaleString()}</div>
                <Link to="/deal/$id" params={{ id: f.deal_id }} className="rounded-2xl bg-gradient-sunset px-3 py-1.5 text-sm font-black text-white shadow-glow">לפרטים</Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["history"], queryFn: listSearchHistory });
  if (q.isLoading) return <SkeletonList />;
  if (!q.data?.length) return <EmptyState title="אין היסטוריית חיפוש" hint="חיפושים שתבצע דרך השאלון יופיעו כאן." />;
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={async () => { await clearSearchHistory(); qc.invalidateQueries({ queryKey: ["history"] }); }}
          className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-foreground">
          <Trash2 className="h-3 w-3" /> נקה הכל
        </button>
      </div>
      <ul className="grid gap-2">
        {q.data.map((h) => (
          <li key={h.id} className="rounded-2xl border border-border bg-card p-4 text-sm shadow-soft">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">{h.destination_name ?? "חיפוש חופשי"}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleString("he-IL")}</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {Object.entries(h.answers).slice(0, 4).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotificationsTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notif_prefs"], queryFn: getNotifPrefs });
  const [local, setLocal] = useState<NotificationPreferences | null>(null);
  useEffect(() => { if (q.data) setLocal(q.data); }, [q.data]);
  if (!local) return <SkeletonList />;

  const set = async (patch: Partial<NotificationPreferences>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    try { await updateNotifPrefs(patch); qc.invalidateQueries({ queryKey: ["notif_prefs"] }); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h2 className="text-base font-black text-foreground">הודעות על דילים חדשים</h2>
      <p className="mt-1 text-xs text-muted-foreground">בחר אילו התראות תרצה לקבל. אפשר לבטל בכל רגע.</p>
      <div className="mt-4 space-y-3">
        <Toggle label="דילים חדשים והתראות מיוחדות" v={local.deals} onChange={(v) => set({ deals: v })} />
        <Toggle label="עדכונים באימייל" v={local.email} onChange={(v) => set({ email: v })} />
        <Toggle label="הודעות SMS / WhatsApp (בעתיד)" v={local.sms} onChange={(v) => set({ sms: v })} disabledNote="יופעל כשנחבר ספק SMS" />
        <Toggle label="התראות Push בדפדפן (בעתיד)" v={local.push} onChange={(v) => set({ push: v })} disabledNote="דורש רישום Push" />
      </div>
    </div>
  );
}

function Toggle({ label, v, onChange, disabledNote }: { label: string; v: boolean; onChange: (v: boolean) => void; disabledNote?: string }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/40 p-3">
      <div>
        <div className="text-sm font-bold text-foreground">{label}</div>
        {disabledNote && <div className="text-[10px] text-muted-foreground">{disabledNote}</div>}
      </div>
      <button
        onClick={() => onChange(!v)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${v ? "bg-gradient-sunset" : "bg-muted-foreground/30"}`}
        aria-pressed={v}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${v ? "right-0.5" : "right-[calc(100%-1.375rem)]"}`} />
      </button>
    </label>
  );
}

function ProfileTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => { if (q.data) setName(q.data.display_name ?? ""); }, [q.data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try { await updateProfile({ display_name: name }); qc.invalidateQueries({ queryKey: ["profile"] }); setStatus("saved"); setTimeout(() => setStatus("idle"), 1500); }
    catch { setStatus("idle"); }
  };

  return (
    <form onSubmit={save} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h2 className="text-base font-black text-foreground">הפרופיל שלי</h2>
      <label className="mt-4 block rounded-2xl border border-border bg-muted/40 px-3 py-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">שם לתצוגה</div>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-0.5 w-full bg-transparent text-sm font-bold outline-none" />
      </label>
      <button type="submit" disabled={status === "saving"}
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-sunset px-4 py-2.5 text-sm font-black text-white shadow-glow disabled:opacity-60">
        <UserIcon className="h-4 w-4" /> {status === "saved" ? "נשמר ✓" : "שמור"}
      </button>
    </form>
  );
}

function SkeletonList() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted/50" />)}
    </div>
  );
}
