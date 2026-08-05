import { Baggage, Clock, Plane } from "lucide-react";
import type { Deal } from "@/lib/deals";
import type { FlightAlternative } from "@/lib/deal-alternatives";
import type { VerificationPresentation } from "@/lib/deal-verification";
import { VerificationBadge } from "./VerificationBadge";
import { fmtCents } from "@/lib/deal-pricing";

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}
function date(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "short" });
}
function dur(min: number) {
  return `${Math.floor(min / 60)}ש׳ ${min % 60 ? `${min % 60}ד׳` : ""}`.trim();
}

function Leg({
  title,
  flight,
  origin,
  destination,
}: {
  title: string;
  flight: Deal["outbound"];
  origin: string;
  destination: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-ocean text-white">
          <Plane className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-sm font-black text-foreground">{title}</span>
        <span className="text-[12px] font-semibold text-muted-foreground">
          {flight.airline} · {flight.flightNumber}
        </span>
        <span
          className={`ms-auto rounded-full px-2 py-0.5 text-[10px] font-black ${flight.stops === 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}
        >
          {flight.stops === 0 ? "ישירה" : `${flight.stops} עצירות`}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 items-center gap-2 text-center">
        <div>
          <div className="text-lg font-black">{time(flight.departAt)}</div>
          <div className="text-[11px] text-muted-foreground">
            {origin} · {date(flight.departAt)}
          </div>
        </div>
        <div className="text-[11px] font-bold text-muted-foreground">
          <Clock className="mx-auto h-3.5 w-3.5" aria-hidden />
          {dur(flight.durationMinutes)}
        </div>
        <div>
          <div className="text-lg font-black">{time(flight.arriveAt)}</div>
          <div className="text-[11px] text-muted-foreground">
            {destination} · {date(flight.arriveAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DealFlightSection({
  deal,
  alt,
  verification,
  flightsCents,
}: {
  deal: Deal;
  alt: FlightAlternative;
  verification: VerificationPresentation;
  flightsCents: number;
}) {
  const origin = "TLV";
  const destCode = deal.destination.airportCodes[0] ?? deal.destination.name;
  return (
    <div className="space-y-3">
      <Leg title="הלוך" flight={deal.outbound} origin={origin} destination={destCode} />
      <Leg title="חזור" flight={deal.inbound} origin={destCode} destination={origin} />

      <dl className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-3">
        <Fact label="מחלקה" value={alt.cabin} />
        <Fact label="סוג כרטיס" value={alt.fareType} />
        <Fact
          label="כבודת יד"
          value={alt.carryOnIncluded ? "כלולה" : "בתשלום"}
          icon={<Baggage className="h-3.5 w-3.5" aria-hidden />}
        />
        <Fact
          label="מזוודה למטען"
          value={alt.checkedBagIncluded ? `${alt.checkedBagKg} ק״ג כלולה` : "לא כלולה"}
        />
        <Fact label="שינוי" value={alt.changeable ? "אפשרי בתשלום" : "לא ניתן לשינוי"} />
        <Fact label="ביטול" value={alt.refundable ? "בכפוף למדיניות המוביל" : "ללא החזר"} />
        <Fact label="חלק הטיסה במחיר החבילה" value={fmtCents(flightsCents)} />
      </dl>

      <VerificationBadge v={verification} compact />
    </div>
  );
}

function Fact({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-2.5">
      <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-[12px] font-black text-foreground">{value}</dd>
    </div>
  );
}
