import { MapPin } from "lucide-react";
import type { Destination } from "@/lib/catalog";

/**
 * Cover image for a destination. When we don't have a verified photo we render
 * a branded tile instead of a broken/stock image.
 */
export function DestinationImage({
  destination,
  className = "",
  sizeHint,
}: {
  destination: Pick<Destination, "image" | "name" | "country" | "emoji">;
  className?: string;
  sizeHint?: "sm" | "md";
}) {
  if (destination.image) {
    return (
      <img
        src={destination.image}
        alt={`${destination.name}, ${destination.country}`}
        loading="lazy"
        draggable={false}
        width={1200}
        height={800}
        className={className}
      />
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-primary/25 via-accent/20 to-secondary/25 text-foreground ${className}`}
      aria-label={`${destination.name}, ${destination.country}`}
    >
      <span className={sizeHint === "sm" ? "text-xl" : "text-4xl"} aria-hidden>
        {destination.emoji}
      </span>
      {sizeHint !== "sm" && (
        <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
          <MapPin className="h-3 w-3" /> {destination.name}
        </span>
      )}
    </div>
  );
}
