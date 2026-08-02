import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listDestinationRows } from "./catalog.functions";
import { rowToDestination, type Destination } from "./catalog";

export const destinationsQueryOptions = queryOptions({
  queryKey: ["destinations"],
  queryFn: async (): Promise<Destination[]> => {
    const rows = await listDestinationRows();
    return rows.map(rowToDestination);
  },
  staleTime: 10 * 60 * 1000,
});

/** Catalog destinations. Routes must prefetch via `ensureQueryData` in a loader. */
export function useDestinations(): Destination[] {
  return useSuspenseQuery(destinationsQueryOptions).data;
}

/** Only destinations that currently have bookable offers. */
export function useBookableDestinations(): Destination[] {
  return useDestinations().filter((d) => d.hasOffers);
}
