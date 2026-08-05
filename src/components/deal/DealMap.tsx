import { useState } from "react";
import { Compass, ExternalLink, Maximize2, MapPin, Navigation, X } from "lucide-react";
import type { Destination } from "@/lib/catalog";
import {
  NO_LOCATION_LABEL,
  destinationCoords,
  locationFacts,
  navigateUrl,
  osmEmbedUrl,
  osmLinkUrl,
  osmSearchUrl,
} from "@/lib/deal-location";

export function DealMap({ dest, hotelName }: { dest: Destination; hotelName: string }) {
  const [full, setFull] = useState(false);
  const coords = destinationCoords(dest);

  if (!coords) {
    return (
      <p className="rounded-2xl bg-muted p-4 text-sm font-bold text-muted-foreground">
        {NO_LOCATION_LABEL}
      </p>
    );
  }

  const src = osmEmbedUrl(coords);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border">
        <iframe
          title={`מפת ${dest.name}`}
          src={src}
          className="h-[260px] w-full sm:h-[340px]"
          loading="lazy"
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        מרכז המפה: {dest.name} ({coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}) · OpenStreetMap.
        מיקום המלון המדויק ({hotelName}) יאושר מול הספק לפני ההזמנה.
      </p>
      <div className="flex flex-wrap gap-2">
        <MapBtn href={osmLinkUrl(coords)} icon={<Maximize2 className="h-3.5 w-3.5" />}>
          פתח מפה
        </MapBtn>
        <MapBtn
          href={navigateUrl(`${hotelName}, ${dest.name}`, coords)}
          icon={<Navigation className="h-3.5 w-3.5" />}
        >
          נווט למלון
        </MapBtn>
        <button
          type="button"
          onClick={() => setFull(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-black"
        >
          <Compass className="h-3.5 w-3.5" aria-hidden /> מה יש באזור?
        </button>
        <MapBtn
          href={osmSearchUrl("restaurants", coords)}
          icon={<MapPin className="h-3.5 w-3.5" />}
        >
          מסעדות
        </MapBtn>
        <MapBtn href={osmSearchUrl("beaches", coords)} icon={<MapPin className="h-3.5 w-3.5" />}>
          חופים
        </MapBtn>
        <MapBtn
          href={osmSearchUrl("attractions", coords)}
          icon={<MapPin className="h-3.5 w-3.5" />}
        >
          אטרקציות
        </MapBtn>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2">
        {locationFacts(dest).map((f) => (
          <div key={f.label} className="rounded-2xl border border-border bg-muted/40 p-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {f.label}
            </dt>
            <dd className="mt-0.5 text-[12px] font-black text-foreground">{f.value}</dd>
          </div>
        ))}
      </dl>

      {full && (
        <div className="fixed inset-0 z-50 bg-background" role="dialog" aria-label="מפה מלאה">
          <button
            type="button"
            onClick={() => setFull(false)}
            aria-label="סגור מפה"
            className="absolute top-4 left-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-border bg-card shadow-soft"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <iframe title={`מפת ${dest.name} — מסך מלא`} src={src} className="h-full w-full" />
        </div>
      )}
    </div>
  );
}

function MapBtn({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-black hover:border-primary/50"
    >
      {icon}
      {children}
      <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
    </a>
  );
}
