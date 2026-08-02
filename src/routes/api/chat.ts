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

const tripTypeEnum = z.enum(["beach", "adventure", "romantic", "family", "friends", "nightlife", "nature"]);
const styleEnum = z.enum(["chill", "luxury", "young", "smart"]);
const boardEnum = z.enum(["room-only", "breakfast", "half-board", "all-inclusive"]);

const filtersSchema = z.object({
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
});

const SYSTEM = `אתה NITZI — סוכן נסיעות אישי חכם, לא צ'אטבוט כללי. אתה מדבר עברית טבעית, חמה וקצרה (RTL).
המוטו: "החיים קצרים. תצא לחוות."

חוקי ברזל:
1. אסור להמציא יעדים, מלונות, טיסות, מחירים או זמינות. כל המלצה חייבת להגיע מהכלים searchTrips / buildTrip בלבד.
2. אם אין תוצאה — תגיד את זה במפורש, תסביר למה (emptyReason) ותציע לשנות תנאי (תקציב, כוכבים, ישירה בלבד, יעד אחר מהקטלוג).
3. אל תכתוב מחירים בטקסט שלא הוחזרו מכלי. אל תבטיח זמינות.
4. אל תחזור על פרטי הכרטיסים בטקסט — הממשק מציג אותם. תוסיף רק את השורה האישית: למה זה מתאים דווקא למשתמש.

איך לעבוד:
- הבן את הבקשה, זכור מה כבר נאמר בשיחה (תקציב, תאריכים/לילות, נוסעים, שדה תעופה, מדינות מועדפות, דירוג מלון, בסיס אירוח, ים/בריכה, יעדים שנפסלו).
- כשחסר מידע קריטי (תקציב או מספר נוסעים) — שאל שאלה אחת קצרה, ואם המשתמש אומר "לא משנה לי" פשוט חפש.
- קרא ל-searchTrips עם המסננים שהצלחת לחלץ. אם המשתמש ביקש יעד ספציפי שאין לו חבילה, נסה buildTrip לאותו יעד.
- אם המשתמש רוצה להשוות — קרא ל-compareTrips עם עד 3 מזהי דילים מהתוצאות שכבר הצגת.
- כשלא בטוח אילו יעדים קיימים — קרא ל-listCatalog.
- אחרי כל תוצאה, סיים בשאלת המשך אחת: זול יותר? מלון טוב יותר? רק טיסות ישירות? יעד נוסף?`;

type ChatBody = { messages?: unknown; profile?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatBody;
        const messages = body.messages;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
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
              execute: async ({ destination, filters }) => buildTrip(destination, filters as AgentFilters),
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
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            sendReasoning: true,
          }),
          runIdFetch,
        );
      },
    },
  },
});
