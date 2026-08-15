import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AgentChat } from "@/components/ai/AgentChat";
import { ConversationSidebar } from "@/components/ai/ConversationSidebar";
import { TopNav } from "@/components/TopNav";
import { createConversation } from "@/lib/ai-conversations";
import { useAuth } from "@/lib/auth";
import { destinationsQueryOptions } from "@/lib/use-catalog";
import { AiPageSkeleton } from "@/components/ai/AiPageSkeleton";

export const Route = createFileRoute("/ai/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(destinationsQueryOptions),
  pendingComponent: AiPageSkeleton,
  head: () => ({
    meta: [
      { title: "NITZI AI — סוכן החופשות האישי שלך" },
      {
        name: "description",
        content:
          "שוחח עם סוכן ה-AI של NITZI: ספר מה בא לך, והוא יחפש חבילות, טיסות ומלונות אמיתיים מהקטלוג וימליץ עם הסבר.",
      },
      { property: "og:title", content: "NITZI AI — סוכן החופשות האישי שלך" },
      {
        property: "og:description",
        content: "סוכן AI שמוצא לך חופשה אמיתית מהקטלוג, עם הסבר על כל המלצה.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiIndexPage,
});

function AiIndexPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [guestKey] = useState(() => `guest-${Date.now()}`);

  const startPersistedConversation = (text: string) => {
    if (!user) return false;
    void (async () => {
      try {
        const id = await createConversation(text);
        await navigate({
          to: "/ai/$conversationId",
          params: { conversationId: id },
          search: { q: text },
        });
      } catch {
        toast.error("לא הצלחתי לפתוח שיחה חדשה");
      }
    })();
    return true;
  };

  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          <AgentChat
            chatId={guestKey}
            initialMessages={[]}
            conversationId={null}
            onFirstUserMessage={startPersistedConversation}
          />
        </div>
        <ConversationSidebar />
      </div>
    </div>
  );
}
