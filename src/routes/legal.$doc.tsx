// Legal documents — public route.
//
// /legal/privacy, /legal/terms, /legal/cookies, /legal/accessibility,
// /legal/refunds, /legal/cancellation, /legal/travel-terms

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { getCompanyProfile } from "@/lib/company.functions";
import { LEGAL_SLUGS, LEGAL_TITLES, getLegalDocument, type LegalSlug } from "@/lib/legal";

const companyQuery = queryOptions({
  queryKey: ["company-profile"],
  queryFn: () => getCompanyProfile(),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/legal/$doc")({
  beforeLoad: ({ params }) => {
    if (!LEGAL_SLUGS.includes(params.doc as LegalSlug)) throw notFound();
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(companyQuery),
  head: ({ params }) => {
    const title = LEGAL_TITLES[params.doc as LegalSlug] ?? "מידע משפטי";
    const description = `${title} של NITZI — פלטפורמת חופשות מבוססת AI. מסמך רשמי ומעודכן.`;
    return {
      meta: [
        { title: `${title} · NITZI` },
        { name: "description", content: description },
        { property: "og:title", content: `${title} · NITZI` },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: LegalPage,
});

function LegalPage() {
  const { doc } = Route.useParams();
  const { data: company } = useSuspenseQuery(companyQuery);
  const document = getLegalDocument(doc, company);
  if (!document) return null;

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto w-full max-w-[900px] px-5 py-12 sm:px-8">
        <nav className="mb-6 flex flex-wrap gap-2">
          {LEGAL_SLUGS.map((s) => (
            <Link
              key={s}
              to="/legal/$doc"
              params={{ doc: s }}
              className={
                s === doc
                  ? "rounded-full bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground"
                  : "rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary hover:text-primary"
              }
            >
              {LEGAL_TITLES[s]}
            </Link>
          ))}
        </nav>

        <h1 className="text-3xl font-black sm:text-4xl">{document.title}</h1>
        <p className="mt-2 text-muted-foreground">{document.summary}</p>

        <div className="mt-8 space-y-8">
          {document.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-black">{section.heading}</h2>
              <div className="mt-3 space-y-2">
                {section.body.map((p) => (
                  <p key={p} className="text-sm leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          המסמך מתעדכן מעת לעת. גרסה זו משקפת את פרטי המפעיל כפי שהוגדרו במערכת.
        </p>
      </main>
      <Footer />
    </div>
  );
}
