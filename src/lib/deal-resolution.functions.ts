// Server function wrapper for resolveOffer() — the /deal/:id route calls
// this only for canonical SANDBOX/LIVE ids (non-legacy-demo). The legacy
// DEMO path never touches this file at all.

import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { resolveOffer } from "@/lib/offers/resolve-offer.server";

export const resolveDealOffer = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ canonicalId: z.string().trim().min(1).max(300) }).parse(data),
  )
  .handler(async ({ data }) => resolveOffer(data.canonicalId));

export const dealResolutionQueryOptions = (canonicalId: string) =>
  queryOptions({
    queryKey: ["deal-resolution", canonicalId],
    queryFn: () => resolveDealOffer({ data: { canonicalId } }),
    staleTime: 0, // a resolution is only ever trustworthy at the moment it was fetched
  });
