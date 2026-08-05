import { Check, ThermometerSun, X } from "lucide-react";
import type { Deal } from "@/lib/deals";
import { audienceFor } from "@/lib/concierge/audience";
import { weatherSummary, NO_WEATHER_DATA } from "@/lib/concierge/weather";
import { experienceProfile, NO_EXPERIENCE_DATA } from "@/lib/concierge/experience";

export function ConciergeAudience({ deal }: { deal: Deal }) {
  const { fits, avoid } = audienceFor(deal);

  const col = (
    title: string,
    items: typeof fits,
    tone: "good" | "bad",
    empty: string,
  ) => (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-2 text-sm font-black text-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs font-semibold text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((f) => (
            <li key={f.key} className="flex gap-2">
              {tone === "good" ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : (
                <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              )}
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foreground">{f.label}</span>
                <span className="block text-xs text-muted-foreground">{f.reason}</span>
                <span className="block text-[10px] text-muted-foreground/70">מקור: {f.source}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {col("מתאים במיוחד ל", fits, "good", "אין סיווגים מאומתים ביעד הזה.")}
      {col("פחות מתאים ל", avoid, "bad", "אין נתון מאומת שמצביע על אי-התאמה.")}
    </div>
  );
}

export function ConciergeWeather({ deal }: { deal: Deal }) {
  const facts = weatherSummary(deal.destination);
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {facts.map((f) => (
        <div key={f.key} className="rounded-2xl border border-border bg-card p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
            <ThermometerSun className="h-3.5 w-3.5 text-primary" /> {f.label}
          </p>
          <p
            className={`mt-1 text-sm font-black ${
              f.value ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {f.value ?? NO_WEATHER_DATA}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/70">{f.source}</p>
        </div>
      ))}
    </div>
  );
}

export function ConciergeExperience({ deal }: { deal: Deal }) {
  const dims = experienceProfile(deal);
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {dims.map((d) => (
        <div key={d.key} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-foreground">{d.label}</span>
            <span
              className={`text-sm font-black ${
                d.value === null ? "text-muted-foreground" : "text-primary"
              }`}
            >
              {d.value === null ? "—" : d.value}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-sunset"
              style={{ width: `${d.value ?? 0}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground/80">
            {d.value === null ? NO_EXPERIENCE_DATA : d.basis}
          </p>
        </div>
      ))}
    </div>
  );
}
