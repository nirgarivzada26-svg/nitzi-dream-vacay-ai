import { createServerFn } from "@tanstack/react-start";
import type { DestinationRow } from "./catalog";
import { fetchDestinationRows } from "./catalog.server";

/**
 * Public read of the managed destination catalog. Uses the publishable key so
 * the anon SELECT policy applies — no user session required, safe for SSR and
 * for public route loaders.
 */
export const listDestinationRows = createServerFn({ method: "GET" }).handler(
  async (): Promise<DestinationRow[]> => fetchDestinationRows(),
);
