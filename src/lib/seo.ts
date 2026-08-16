/**
 * SEO helpers.
 *
 * NITZI is reachable on nitzi.co, www.nitzi.co and the *.lovable.app hosts.
 * A single absolute canonical origin keeps search engines from treating those
 * as duplicate sites.
 */
export const SITE_ORIGIN = "https://www.nitzi.co";

/** Absolute canonical <link> for a public page path (e.g. "/packages"). */
export function canonicalLink(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return { rel: "canonical", href: `${SITE_ORIGIN}${clean === "/" ? "" : clean}` } as const;
}
