import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import {
  createLovableAiGatewayRunIdFetch,
  createNitziAiProvider,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import { buildTrip, compareTrips, listCatalog, searchTrips } from "@/lib/agent/agent-search.server";
import type { AgentFilters } from "@/lib/agent/agent-types";

const tripTypeEnum = z.enum([
  "beach",
  "adventure",
  "romantic",
  "family",
  "friends",
  "nightlife",
  "nature",
]);
const styleEnum = z.enum(["chill", "luxury", "young", "smart"]);
const boardEnum = z.enum(["room-only", "breakfast", "half-board", "all-inclusive"]);

export const filtersSchema = z.object({
  destinations: z.array(z.string()).nullable(),
  countries: z.array(z.string()).nullable(),
  tripType: tripTypeEnum.nullable(),
  style: styleEnum.nullable(),
  maxBudgetPerPerson: z.number().nullable(),
  nights: z.number().nullable(),
  people: z.number().nullable(),
  minStars: z.number().nullable(),
  board: boardEnum.nullable(),
  directOnly: z.boolean().nullable(),
  musts: z.array(z.enum(["pool", "beach", "all-inclusive", "free-cancellation"])).nullable(),
  exclude: z.array(z.string()).nullable(),
  // Context-only — never used to filter search results (the catalog can't
  // genuinely support these yet). See agent-search.server.ts.
  requestedDates: z.string().nullable(),
  dateFlexibility: z.enum(["fixed", "flexible", "very-flexible"]).nullable(),
  childrenAges: z.array(z.number()).nullable(),
  baggagePreference: z.enum(["checked", "carry-on-only"]).nullable(),
});

const SYSTEM = `אתה NITZI — סוכן נסיעות אישי חכם, לא צ'אטבוט כללי. אתה מדבר עברית טבעית, חמה וקצרה (RTL).
המוטו: "החיים קצרים. תצא לחוות."

חוקי ברזל:
1. אסור להמציא יעדים, מלונות, טיסות, מחירים או זמינות. כל המלצה חייבת להגיע מהכלים searchTrips / buildTrip בלבד.
2. אם אין תוצאה — תגיד את זה במפורש, תסביר למה (emptyReason/blockingConstraint) ותציע לשנות תנאי (תקציב, כוכבים, ישירה בלבד, יעד אחר מהקטלוג).
3. אל תכתוב מחירים בטקסט שלא הוחזרו מכלי. אל תבטיח זמינות.
4. אל תחזור על פרטי הכרטיסים בטקסט — הממשק מציג אותם. תוסיף רק את השורה האישית: למה זה מתאים דווקא למשתמש.

איך לעבוד — משמעת שיחה:
- בכל הודעה, חלץ כמה שיותר פרטים אמיתיים מהטקסט החופשי של המשתמש בבת אחת (יעד, תאריכים/גמישות, נוסעים, גילאי ילדים, תקציב, רמת מלון, בסיס אירוח, טיסה ישירה, כבודה, ים, חיי לילה, משפחה, יוקרה/תקציבי/רגוע).
- זכור כל מה שכבר נאמר בשיחה — אל תשאל שוב על פרט שכבר נמסר, גם אם המשתמש לא חזר עליו בהודעה האחרונה.
- כשמידע קריטי לחיפוש חסר (בעיקר תקציב או מספר נוסעים) — שאל שאלה אחת קצרה וממוקדת, לא רשימה. אם המשתמש אומר "לא משנה לי" פשוט חפש.
- ברגע שיש מספיק מידע לחיפוש סביר — חפש מיד, אל תמשיך לשאול. אל תכריח את המשתמש לענות על כל שאלה אפשרית.
- בכל פעם שאתה לומד או משנה העדפה כלשהי (גם אם עוד לא חיפשת) — קרא ל-updateKnownPreferences עם כל מה שידוע עד כה, כדי שהממשק יציג למשתמש "מה NITZI כבר יודע".

שדות הקשר בלבד (אינם מסננים תוצאות היום):
- requestedDates / dateFlexibility: לקטלוג של NITZI אין היום מלאי אמיתי לפי חודש/תאריך ספציפי — כל התאריכים המוצגים הם התאריכים שבפועל זמינים בקטלוג. שמור את הבקשה לשיחה, אך אם המשתמש שואל אם התאריך שלו נענה — תגיד את זה בכנות, אל תעמיד פנים שסיננת לפי תאריך.
- childrenAges: הקטלוג היום לא מבחין בין חבילה למבוגרים לחבילה עם ילדים ברמת המלאי/המחיר — שמור את הגילאים לשיחה (זה עוזר לך לנסח למה יעד מתאים למשפחה), אך אל תטען שסיננת תוצאות לפי גיל ילד.
- baggagePreference: כל חבילה כוללת כבודה 20 ק״ג לאדם כברירת מחדל (זו עובדה אמיתית מהקטלוג), ואפשר להוסיף מזוודה נוספת בתשלום בשלב ההזמנה — זה מידע אמיתי שאפשר לשתף, אבל זה לא משנה אילו חבילות מוצגות.
- קרא ל-searchTrips עם המסננים שהצלחת לחלץ. אם המשתמש ביקש יעד ספציפי שאין לו חבילה, נסה buildTrip לאותו יעד.
- אם המשתמש רוצה להשוות — קרא ל-compareTrips עם עד 3 מזהי דילים מהתוצאות שכבר הצגת.
- כשלא בטוח אילו יעדים קיימים — קרא ל-listCatalog.
- אחרי כל תוצאה, סיים בשאלת המשך אחת: זול יותר? מלון טוב יותר? רק טיסות ישירות? יעד נוסף?`;

type ChatBody = { messages?: unknown; profile?: unknown };

// Abuse guards for a public LLM endpoint: bounded payload + per-identity quota.
const MAX_MESSAGES = 60;
const MAX_BODY_CHARS = 24_000;
const RATE_LIMIT = 40; // requests
const RATE_WINDOW_SECONDS = 3600;

/** Signed-in user id when a bearer token is present, otherwise the client IP. */
async function identify(request: Request): Promise<string> {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearer) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(
        process.env["SUPABASE_URL"]!,
        process.env["SUPABASE_PUBLISHABLE_KEY"]!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data } = await sb.auth.getUser(bearer);
      if (data.user) return `user:${data.user.id}`;
    } catch {
      /* fall through to IP */
    }
  }
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return `ip:${ip}`;
}

async function withinQuota(identity: string): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("ai_rate_limit_hit", {
      _identity: identity,
      _limit: RATE_LIMIT,
      _window_seconds: RATE_WINDOW_SECONDS,
    });
    if (error) return true; // never block on limiter failure
    return data !== false;
  } catch {
    return true;
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > MAX_BODY_CHARS) {
          return new Response("Message too long", { status: 413 });
        }
        let body: ChatBody;
        try {
          body = JSON.parse(raw) as ChatBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = body.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }
        if (messages.length > MAX_MESSAGES) {
          return new Response("Conversation too long", { status: 413 });
        }

        const identity = await identify(request);
        if (!(await withinQuota(identity))) {
          return new Response("הגעת למכסת השיחות לשעה. נסה שוב בעוד קצת.", {
            status: 429,
            headers: { "retry-after": String(RATE_WINDOW_SECONDS) },
          });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const lovable = createNitziAiProvider(apiKey, runIdFetch);

        const profile = body.profile as
          | { favorites?: string[]; booked?: string[]; avgBudget?: number | null }
          | undefined;
        const personalization =
          profile && (profile.favorites?.length || profile.booked?.length || profile.avgBudget)
            ? `\n\nמידע אישי על המשתמש (לשימוש בהתאמה, לא להמצאה): מועדפים: ${profile.favorites?.join(", ") || "אין"}. הזמנות קודמות: ${profile.booked?.join(", ") || "אין"}. תקציב ממוצע קודם לאדם: ${profile.avgBudget ? `₪${profile.avgBudget}` : "לא ידוע"}.`
            : "";

        const result = streamText({
          model: lovable.responses("openai/gpt-5.6-sol"),
          system: SYSTEM + personalization,
          messages: await convertToModelMessages(messages as UIMessage[]),
          stopWhen: stepCountIs(20),
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
          tools: {
            searchTrips: tool({
              description:
                "חיפוש חבילות אמיתיות בקטלוג NITZI לפי מסננים. מחזיר המלצות עם מחיר, NITZI Score, מחיר חכם וסיבות. השתמש בכל בקשה של המשתמש למצוא חופשה.",
              inputSchema: z.object({ filters: filtersSchema, limit: z.number().nullable() }),
              execute: async ({ filters, limit }) =>
                searchTrips(filters as AgentFilters, limit ?? 5),
            }),
            buildTrip: tool({
              description:
                "מרכיב חופשה מטיסה + מלון אמיתיים מהספקים, כשאין חבילה מוכנה ליעד מסוים בקטלוג.",
              inputSchema: z.object({ destination: z.string(), filters: filtersSchema }),
              execute: async ({ destination, filters }) =>
                buildTrip(destination, filters as AgentFilters),
            }),
            compareTrips: tool({
              description: "משווה עד 3 דילים לפי מזהה (dealId) שכבר הוצגו למשתמש.",
              inputSchema: z.object({ dealIds: z.array(z.string()) }),
              execute: async ({ dealIds }) => compareTrips(dealIds),
            }),
            listCatalog: tool({
              description: "רשימת כל היעדים הקיימים בקטלוג NITZI, כולל אילו מהם ניתנים להזמנה.",
              inputSchema: z.object({}),
              execute: async () => listCatalog(),
            }),
            updateKnownPreferences: tool({
              description:
                "מעדכן את פאנל 'מה NITZI כבר יודע' בממשק עם כל ההעדפות שחולצו עד כה מהשיחה — כולל שדות הקשר בלבד (תאריכים, גמישות, גילאי ילדים, כבודה) שאינם משפיעים על תוצאות חיפוש. קרא לזה בכל פעם שנודע לך משהו חדש, גם אם עוד לא הגיע הזמן לחפש.",
              inputSchema: z.object({ known: filtersSchema }),
              execute: async ({ known }) => known,
            }),
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            sendReasoning: true,
            onError: (error) => {
              const message = error instanceof Error ? error.message : String(error);
              // Recorded so the commercial checklist and monitoring pulse can
              // see real agent failures instead of assuming health.
              void import("@/lib/app-errors.server").then(({ logAppError }) =>
                logAppError({
                  source: "ai",
                  message,
                  route: "/api/chat",
                  userId: null,
                }),
              );
              return "אירעה שגיאה בסוכן. נסה שוב.";
            },
          }),
          runIdFetch,
        );
      },
    },
  },
});
