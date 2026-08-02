import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Bookmark, CheckCircle2, GitCompare, Hotel as HotelIcon, MapPin, Shield, Sparkles, Star, Utensils, Waves, XCircle } from "lucide-react";
import { NitziLogo } from "@/components/NitziLogo";
import { WhyNitziButton } from "@/components/WhyNitziButton";
import { SimilarPicks } from "@/components/SimilarPicks";
import { findHotel, getResultsCache } from "@/lib/results-cache";
import { budgetFit } from "@/lib/ranking";
import { amenityLabel, explainHotel } from "@/lib/explain";
import { isCompared, toggleCompare, useCompare } from "@/lib/compare-store";
import { pickDestination } from "@/lib/nitzi-data";

export const Route = createFileRoute("/hotel/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `מלון — NITZI` },
      { name: "description", content: `פרטי מלון מלאים, שירותים, מחיר מעודכן והזמנה. NITZI ${decodeURIComponent(params.id)}` },
      { property: "og:title", content: "פרטי מלון — NITZI" },
      { property: "og:description", content: "גלריה, שירותים, מיקום, מחיר ותנאי ביטול." },
    ],
  }),
  component: HotelDetailPage,
});

function fmtILS(n: number) { return `₪${Math.round(n).toLocaleString()}`; }

function HotelDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const hotel = findHotel(id);
  const cache = getResultsCache();
  useCompare(); // subscribe

  if (!hotel || !cache) return <NotFound onBack={() => navigate({ to: "/" })} />;
  const dest = pickDestination(cache.answers);
  const fit = budgetFit(hotel, cache.answers);
  const nights = cache.answers.days;
  const totalStay = hotel.pricePerNight * nights;
  const totalWithPeople = totalStay * Math.max(1, cache.answers.people);
  const inCompare = isCompared(hotel.id, "hotel");

  const reasons = [
    `${hotel.name} דורג ${hotel.guestRating.toFixed(1)}/10 על ידי ${hotel.reviewsCount.toLocaleString()} אורחים.`,
    `${hotel.stars} כוכבים — ${cache.answers.style === "luxury" ? "מתאים לסגנון היוקרתי שבחרת" : "רמה גבוהה שמתאימה לסגנון שלך"}.`,
    fit === "within" ? "המחיר בתוך התקציב שלך." : fit === "slightly-over" ? "מעט מעל התקציב, אבל שווה את התוספת." : "מעל התקציב — נשמר להשוואה בלבד.",
    hotel.distanceToBeachKm != null ? `${hotel.distanceToBeachKm} ק״מ מהחוף — מיקום מעולה לחופשת ים.` : `במיקום מרכזי ב-${hotel.location}.`,
    `ציון NITZI: ${hotel.score}% — משוקלל לפי תקציב, סגנון, סוג החופשה ודירוגי אורחים.`,
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <button onClick={() => navigate({ to: "/result" })} className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card" aria-label="חזרה">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <NitziLogo />
          <button onClick={() => toggleCompare({ id: hotel.id, kind: "hotel" })} className={`grid h-11 w-11 place-items-center rounded-full border ${inCompare ? "border-primary bg-primary text-white" : "border-border bg-card"}`} aria-label="השווה">
            <GitCompare className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-5 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-[2rem] shadow-glow">
              <img src={dest.image} alt={hotel.name} className="h-[320px] w-full object-cover sm:h-[440px] lg:h-[500px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              {hotel.score >= 88 && (
                <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-gradient-sunset px-3 py-1.5 text-[11px] font-black text-white shadow-glow">
                  <Sparkles className="h-3.5 w-3.5" /> הבחירה של NITZI
                </span>
              )}
              <div className="absolute bottom-0 inset-x-0 p-5 text-white sm:p-6">
                <p className="text-[11px] font-bold text-white/85">{hotel.location}</p>
                <h1 className="text-3xl font-black leading-tight drop-shadow-md sm:text-5xl">{hotel.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/90">
                  <Stars n={hotel.stars} />
                  <span>· דירוג {hotel.guestRating.toFixed(1)}/10</span>
                  <span>· {hotel.reviewsCount.toLocaleString()} ביקורות</span>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-soft">
              <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-900">
                <BadgeCheck className="h-5 w-5" />
                <span className="font-black">מחיר נבדק ואומת</span>
                <span className="text-[11px]">מקור: {hotel.source} · עודכן לפני מספר דקות</span>
                <span className="ms-auto"><WhyNitziButton reasons={reasons} score={hotel.score} /></span>
              </div>
            </section>

            <Section title="שירותים במלון" icon={<Sparkles className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-2">
                {hotel.amenities.map((a) => (
                  <span key={a} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">✓ {amenityLabel(a)}</span>
                ))}
              </div>
            </Section>

            <Section title="על המלון" icon={<HotelIcon className="h-4 w-4" />}>
              <p className="text-[15px] leading-relaxed text-foreground">
                {explainHotel(hotel, cache.answers)} מלון של {hotel.stars} כוכבים במיקום {hotel.location}, עם דירוג אורחים גבוה של {hotel.guestRating.toFixed(1)} מתוך 10 על סמך {hotel.reviewsCount.toLocaleString()} ביקורות אמיתיות.
              </p>
            </Section>

            <div className="grid gap-4 sm:grid-cols-2">
              <Section title="מה כלול" icon={<CheckCircle2 className="h-4 w-4" />}>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {nights} לילות ב{hotel.name}</li>
                  {hotel.amenities.includes("breakfast") && <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> ארוחת בוקר יומית</li>}
                  {hotel.amenities.includes("wifi") && <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Wi-Fi חינם</li>}
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> תמיכה 24/7 של NITZI</li>
                </ul>
              </Section>
              <Section title="מה לא כלול" icon={<XCircle className="h-4 w-4" />}>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" /> טיסות (רכיב נפרד)</li>
                  <li className="flex gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" /> העברות משדה תעופה</li>
                  <li className="flex gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" /> ביטוח נסיעות</li>
                </ul>
              </Section>
            </div>

            <Section title="מיקום" icon={<MapPin className="h-4 w-4" />}>
              <div className="relative h-48 overflow-hidden rounded-2xl border border-border">
                <div className="absolute inset-0 bg-gradient-ocean opacity-80" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-primary shadow-glow animate-pulse-glow">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="mt-1 text-xs font-black text-white drop-shadow">{hotel.location}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {hotel.distanceToCenterKm != null && <span><MapPin className="mr-0.5 inline h-3 w-3" />{hotel.distanceToCenterKm} ק״מ ממרכז העיר</span>}
                {hotel.distanceToBeachKm != null && <span><Waves className="mr-0.5 inline h-3 w-3" />{hotel.distanceToBeachKm} ק״מ מהחוף</span>}
              </div>
            </Section>

            <Section title="תנאי ביטול" icon={<Shield className="h-4 w-4" />}>
              <p className="text-sm text-foreground">ביטול חינם עד 7 ימים לפני צ'ק-אין. לאחר מכן — חיוב של לילה ראשון.</p>
            </Section>

            <SimilarPicks excludeName={dest.name} title="מלונות דומים שאולי תאהב" />

            <Section title="מסעדות מומלצות באזור" icon={<Utensils className="h-4 w-4" />}>
              <ul className="space-y-2 text-sm">
                {dest.restaurants.map((r) => (
                  <li key={r} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{r}</li>
                ))}
              </ul>
            </Section>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-3 rounded-3xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-black text-foreground">{fmtILS(hotel.pricePerNight)}</div>
                  <div className="text-xs text-muted-foreground">ללילה · לכל החדר</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${fit === "within" ? "bg-emerald-100 text-emerald-800" : fit === "slightly-over" ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-800"}`}>
                  {fit === "within" ? "בתקציב" : fit === "slightly-over" ? "מעט מעל" : "חורג"}
                </span>
              </div>
              <div className="rounded-2xl bg-muted/50 p-3 text-xs text-muted-foreground">
                {nights} לילות · {cache.answers.people} נוסעים
                <div className="mt-1 text-base font-black text-foreground">סה״כ {fmtILS(totalWithPeople)}</div>
              </div>
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-sunset px-5 py-4 text-base font-black text-white shadow-glow">
                <Bookmark className="h-5 w-5" /> הזמן עכשיו
              </button>
              <p className="text-center text-[11px] text-muted-foreground">המחיר יאומת מחדש לפני התשלום</p>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 shadow-glow backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-2">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">מחיר ללילה</div>
            <div className="text-xl font-black text-foreground">{fmtILS(hotel.pricePerNight)}</div>
            <div className="text-[10px] text-muted-foreground">סה״כ {fmtILS(totalWithPeople)}</div>
          </div>
          <button className="ms-auto flex items-center gap-2 rounded-2xl bg-gradient-sunset px-5 py-3 text-sm font-black text-white shadow-glow">
            הזמן עכשיו
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
      <h3 className="flex items-center gap-2 text-base font-black text-foreground">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-sunset text-white">{icon}</span>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function Stars({ n }: { n: number }) {
  return <span className="inline-flex" aria-label={`${n} כוכבים`}>{Array.from({ length: n }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</span>;
}
function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div dir="rtl" className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div>
        <h1 className="text-2xl font-black">המלון לא נמצא</h1>
        <p className="mt-2 text-sm text-muted-foreground">חזור לעמוד התוצאות ובחר מלון מחדש.</p>
        <button onClick={onBack} className="mt-4 rounded-2xl bg-gradient-sunset px-5 py-2 text-sm font-black text-white shadow-glow">חזרה לבית</button>
      </div>
    </div>
  );
}
