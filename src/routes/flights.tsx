import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock,
  Info,
  Loader2,
  MapPin,
  Plane,
  Search,
  Users,
} from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { fareDetails } from "@/lib/flight-details";
import { Footer } from "@/components/Footer";
import { DestinationPicker } from "@/components/DestinationPicker";
import { destinationsQueryOptions, useDestinations } from "@/lib/use-catalog";
import { findDestination } from "@/lib/catalog";
import { searchFlights, type ScoredFlight } from "@/lib/flight-search";

export const Route = createFileRoute("/flights")({
  head: () => ({
    meta: [
      { title: "טיסות — חיפוש טיסות זולות מתל אביב | NITZI" },
      {
        name: "description",
        content:
          "חפשו טיסות לפי יעד, תאריכים ומספר נוסעים. חברות תעופה, שעות, עצירות ומחיר לאדם — הכל במקום אחד.",
      },
      { property: "og:title", content: "חיפוש טיסות — NITZI" },
      {
        property: "og:description",
        content: "טיסות הלוך-חזור מתל אביב לכל היעדים בקטלוג של NITZI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(destinationsQueryOptions),
  component: FlightsPage,
});

const fmtILS = (n: number) => `₪${Math.round(n).toLocaleString()}`;
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const fmtDur = (min: number) =>
  `${Math.floor(min / 60)}ש׳ ${min % 60 ? `${min % 60}ד׳` : ""}`.trim();

function FlightsPage() {
  const catalog = useDestinations();
  const [origin, setOrigin] = useState("תל אביב (TLV)");
  const [destSlug, setDestSlug] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [depart, setDepart] = useState("");
  const [ret, setRet] = useState("");
  const [people, setPeople] = useState(2);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScoredFlight[] | null>(null);

  const dest = findDestination(catalog, destSlug);

  const run = async () => {
    if (!dest) {
      setPickerOpen(true);
      return;
    }
    setLoading(true);
    try {
      const flights = await searchFlights({
        origin: "TLV",
        destination: dest,
        departDate: depart,
        returnDate: ret,
        people,
      });
      setResults(flights);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <TopNav />

      <main className="mx-auto w-full max-w-[1600px] px-5 pb-20 pt-8 sm:px-8">
        <header className="max-w-3xl">
          <h1 className="text-4xl font-black text-foreground sm:text-5xl">טיסות בלבד ✈️</h1>
          <p className="mt-2 text-base text-muted-foreground sm:text-lg">
            רק טיסה, בלי מלון. בחרו יעד ותאריכים ו-NITZI ידרג עבורכם את האפשרויות לפי מחיר, עצירות
            ושעות.
          </p>
        </header>

        <section className="mt-6 rounded-[2rem] border border-border/60 bg-card p-5 shadow-soft sm:p-7">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Field icon={<Plane className="h-4 w-4" />} label="מאיפה">
              <input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-transparent text-base font-bold text-foreground outline-none"
              />
            </Field>

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="block rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-right transition hover:border-primary"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="text-primary">
                  <MapPin className="h-4 w-4" />
                </span>{" "}
                לאן
              </div>
              <div
                className={`mt-0.5 truncate text-base font-bold ${dest ? "text-foreground" : "text-muted-foreground"}`}
              >
                {dest ? `${dest.name} ${dest.emoji}` : "בחר יעד..."}
              </div>
            </button>

            <Field icon={<Calendar className="h-4 w-4" />} label="יציאה">
              <input
                type="date"
                value={depart}
                onChange={(e) => setDepart(e.target.value)}
                className="w-full bg-transparent text-base font-bold text-foreground outline-none"
              />
            </Field>
            <Field icon={<Calendar className="h-4 w-4" />} label="חזרה">
              <input
                type="date"
                value={ret}
                onChange={(e) => setRet(e.target.value)}
                className="w-full bg-transparent text-base font-bold text-foreground outline-none"
              />
            </Field>
            <Field icon={<Users className="h-4 w-4" />} label="נוסעים">
              <select
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
                className="w-full bg-transparent text-base font-bold text-foreground outline-none"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <button
            onClick={run}
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-sunset py-5 text-lg font-black text-white shadow-glow transition active:scale-[0.99] disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            {loading ? "מחפש טיסות..." : "חפש טיסות"}
          </button>
        </section>

        {results && (
          <section className="mt-10">
            <h2 className="text-2xl font-black text-foreground">
              {results.length > 0 ? `${results.length} טיסות ל${dest?.name}` : "לא נמצאו טיסות"}
            </h2>
            {results.length === 0 ? (
              <div className="mt-4 flex items-center gap-3 rounded-3xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" />
                אין כרגע טיסות זמינות מהספקים ליעד ולתאריכים האלה. נסו תאריכים אחרים.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {results.map((f) => (
                  <Link
                    key={f.id}
                    to="/flight/$id"
                    params={{ id: f.id }}
                    className="group grid items-center gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition hover:shadow-glow sm:grid-cols-[1fr_auto]"
                  >
                    <div className="flex flex-wrap items-center gap-5">
                      <div className="min-w-[140px]">
                        <div className="text-lg font-black text-foreground">{f.airline}</div>
                        <div className="text-xs text-muted-foreground">טיסה {f.flightNumber}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-black text-foreground">
                            {fmtTime(f.departAt)}
                          </div>
                          <div className="text-[11px] font-bold text-muted-foreground">
                            {f.origin}
                          </div>
                        </div>
                        <div className="flex flex-col items-center px-2">
                          <Plane className="h-4 w-4 text-primary" />
                          <span className="mt-1 text-[11px] font-bold text-muted-foreground">
                            {fmtDur(f.durationMinutes)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {f.stops === 0 ? "ישירה" : `${f.stops} עצירות`}
                          </span>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-foreground">
                            {fmtTime(f.arriveAt)}
                          </div>
                          <div className="text-[11px] font-bold text-muted-foreground">
                            {f.destination}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                        <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                          <Briefcase className="h-3 w-3" /> {fareDetails(f).checkedBag}
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                          <Clock className="h-3 w-3" /> ציון NITZI {f.score}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                      <div className="text-left">
                        <div className="text-2xl font-black text-foreground">{fmtILS(f.price)}</div>
                        <div className="text-[11px] font-bold text-muted-foreground">
                          לאדם · סה״כ {fmtILS(f.price * people)}
                        </div>
                      </div>
                      <span className="flex items-center gap-1 rounded-2xl bg-gradient-sunset px-4 py-2 text-sm font-black text-white shadow-glow">
                        לפרטים <ArrowLeft className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />

      <DestinationPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(v) => setDestSlug(v)}
      />
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 transition focus-within:border-primary">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <span className="text-primary">{icon}</span> {label}
      </div>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}
