import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { AgentChat } from "@/components/ai/AgentChat";
import { ConversationSidebar } from "@/components/ai/ConversationSidebar";
import { TopNav } from "@/components/TopNav";
import { loadMessages } from "@/lib/ai-conversations";
import { useAuth } from "@/lib/auth";
import { destinationsQueryOptions } from "@/lib/use-catalog";

export const Route = createFileRoute("/ai/$conversationId")({
  loader: ({ context }) => context.queryClient.ensureQueryData(destinationsQueryOptions),
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "שיחה עם NITZI AI" },
      {
        name: "description",
        content: "המשך שיחה שמורה עם סוכן החופשות של NITZI וקבל המלצות מהקטלוג.",
      },
      { property: "og:title", content: "שיחה עם NITZI AI" },
      { property: "og:description", content: "המשך את השיחה שלך עם סוכן החופשות של NITZI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiThreadPage,
});

function AiThreadPage() {
  const { conversationId } = Route.useParams();
  const { q } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/ai" });
      return;
    }
    let alive = true;
    setInitial(null);
    loadMessages(conversationId)
      .then((m) => {
        if (alive) setInitial(m);
      })
      .catch(() => {
        if (alive) setInitial([]);
      });
    return () => {
      alive = false;
    };
  }, [conversationId, user, loading, navigate]);

  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          {initial === null ? (
            <div className="grid flex-1 place-items-center text-sm font-bold text-muted-foreground">
              טוען שיחה…
            </div>
          ) : (
            <AgentChat
              key={conversationId}
              chatId={conversationId}
              initialMessages={initial}
              conversationId={conversationId}
              autoSend={initial.length === 0 ? (q ?? null) : null}
            />
          )}
        </div>
        <ConversationSidebar activeId={conversationId} />
      </div>
    </div>
  );
}
