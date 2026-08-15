import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AlertTriangle, Compass, RefreshCw, Search, Wand2 } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput } from "@/components/ai-elements/tool";
import { ComparisonTable, RecommendationCard } from "@/components/ai/RecommendationCard";
import { KnowledgePanel } from "@/components/ai/KnowledgePanel";
import { QuickReplyChips } from "@/components/ai/QuickReplyChips";
import type { AgentComparison, AgentSearchResult, KnownPreferences } from "@/lib/agent/agent-types";
import { saveMessage } from "@/lib/ai-conversations";
import { useAuth } from "@/lib/auth";
import { listBookings, listFavorites } from "@/lib/user-data";

const SUGGESTIONS = [
  "אני רוצה חופשה ביוון עד ₪7,000 לאדם",
  "חופשה זוגית עם מלון 5 כוכבים",
  "משפחה עם 2 ילדים, הכל כלול",
  "לא משנה לי לאן — תפתיע אותי",
];

interface Profile {
  favorites: string[];
  booked: string[];
  avgBudget: number | null;
}

function isSearchResult(v: unknown): v is AgentSearchResult {
  return !!v && typeof v === "object" && "recommendations" in (v as Record<string, unknown>);
}
function isComparison(v: unknown): v is AgentComparison {
  return (
    !!v &&
    typeof v === "object" &&
    "rows" in (v as Record<string, unknown>) &&
    "items" in (v as Record<string, unknown>)
  );
}

const TOOL_LABEL: Record<string, string> = {
  "tool-searchTrips": "חיפוש חבילות בקטלוג",
  "tool-buildTrip": "הרכבת טיסה + מלון",
  "tool-compareTrips": "השוואת דילים",
  "tool-listCatalog": "בדיקת יעדים זמינים",
  "tool-updateKnownPreferences": "עדכון מה שידוע עד כה",
};

export function AgentChat({
  chatId,
  initialMessages,
  conversationId,
  autoSend,
  onFirstUserMessage,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  /** When set, assistant + user messages are persisted to this conversation. */
  conversationId: string | null;
  /** Text to send automatically once on mount. */
  autoSend?: string | null;
  /** Guest flow: called instead of sending when there is no conversation yet. */
  onFirstUserMessage?: (text: string) => boolean;
}) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const savedIds = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)));
  const autoSent = useRef(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const [favs, bookings] = await Promise.all([listFavorites(), listBookings()]);
        if (!alive) return;
        const budgets = bookings.map((b) => b.price_per_person).filter((n) => n > 0);
        setProfile({
          favorites: Array.from(new Set(favs.map((f) => f.destination_name))).slice(0, 8),
          booked: Array.from(new Set(bookings.map((b) => b.destination_name))).slice(0, 8),
          avgBudget: budgets.length
            ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length)
            : null,
        });
      } catch {
        /* personalization is optional */
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { profile } }),
    [profile],
  );

  const { messages, sendMessage, status, error, regenerate, clearError } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    // Only one visible error surface (the inline card below) — no toast, to
    // avoid showing the same failure twice. The raw error is never rendered
    // to the user anywhere; see the inline card's fixed, safe copy.
  });

  // Persist new messages for signed-in conversations.
  useEffect(() => {
    if (!conversationId || status === "streaming" || status === "submitted") return;
    for (const m of messages) {
      if (savedIds.current.has(m.id)) continue;
      savedIds.current.add(m.id);
      void saveMessage(conversationId, m);
    }
  }, [messages, status, conversationId]);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    focusInput();
  }, [chatId, focusInput]);
  useEffect(() => {
    if (status === "ready") focusInput();
  }, [status, focusInput]);

  useEffect(() => {
    if (autoSent.current || !autoSend) return;
    autoSent.current = true;
    void sendMessage({ text: autoSend });
  }, [autoSend, sendMessage]);

  const busy = status === "submitted" || status === "streaming";

  // Derived, never client-invented: the latest structured preferences the
  // model itself emitted via updateKnownPreferences, or (as a fallback)
  // the filters it actually used for its most recent search — whichever
  // is more recent in the transcript.
  const known = useMemo<KnownPreferences | null>(() => {
    let latest: KnownPreferences | null = null;
    for (const message of messages) {
      for (const part of message.parts) {
        if (!part.type.startsWith("tool-")) continue;
        const p = part as unknown as { type: string; output?: unknown };
        if (p.type === "tool-updateKnownPreferences" && p.output) {
          latest = p.output as KnownPreferences;
        } else if (
          (p.type === "tool-searchTrips" || p.type === "tool-buildTrip") &&
          isSearchResult(p.output)
        ) {
          latest = p.output.filtersUsed;
        }
      }
    }
    return latest;
  }, [messages]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    if (onFirstUserMessage && messages.length === 0 && onFirstUserMessage(value)) {
      return;
    }
    void sendMessage({ text: value });
    focusInput();
  };

  const askFollowUp = useCallback((prefill: string) => {
    const el = textareaRef.current;
    if (!el) return;
    // PromptInputTextarea is a controlled component (internal React state) —
    // setting el.value directly wouldn't update that state, so we go
    // through the same native-setter + dispatched-event path React itself
    // listens to for onChange.
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    nativeSetter?.call(el, prefill);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
    el.setSelectionRange(prefill.length, prefill.length);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col" dir="rtl">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 sm:px-6">
          {messages.length === 0 && (
            <div className="mt-6 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-sunset shadow-glow">
                <Compass className="h-8 w-8 text-white" />
              </div>
              <h2 className="mt-4 text-2xl font-black">אני NITZI, סוכן הנסיעות שלך</h2>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                תספר לי מה בא לך — תקציב, כמה אנשים, מתי — ואני אחפש בקטלוג האמיתי ואמליץ.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="rounded-2xl border border-border bg-card px-3.5 py-2 text-[13px] font-bold transition hover:border-primary hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent
                className={
                  message.role === "assistant" ? "bg-transparent p-0 text-foreground" : undefined
                }
              >
                {message.parts.map((part, i) => {
                  const key = `${message.id}-${i}`;

                  if (part.type === "text") {
                    return <MessageResponse key={key}>{part.text}</MessageResponse>;
                  }

                  if (part.type.startsWith("tool-")) {
                    const p = part as unknown as {
                      type: string;
                      state: string;
                      input?: unknown;
                      output?: unknown;
                      errorText?: string;
                    };
                    const output = p.output;
                    return (
                      <div key={key} className="space-y-3">
                        <Tool defaultOpen={false}>
                          <ToolHeader
                            type={p.type as never}
                            state={p.state as never}
                            title={TOOL_LABEL[p.type] ?? p.type}
                          />
                          <ToolContent>
                            <ToolInput input={p.input} />
                          </ToolContent>
                        </Tool>

                        {isSearchResult(output) && output.recommendations.length > 0 && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {output.recommendations.map((rec, idx) => (
                              <RecommendationCard
                                key={`${rec.dealId ?? rec.destinationSlug}-${idx}`}
                                rec={rec}
                                // Alternatives are only ever looked up within
                                // this SAME tool call's own recommendations —
                                // never a separate/fresh lookup.
                                allRecommendations={output.recommendations}
                                onAskFollowUp={askFollowUp}
                              />
                            ))}
                          </div>
                        )}
                        {isSearchResult(output) && output.recommendations.length === 0 && (
                          <div className="space-y-2 rounded-2xl border border-dashed border-border p-3">
                            <p className="flex items-center gap-2 text-[13px] font-bold text-muted-foreground">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              {output.emptyReason ?? "לא נמצאו תוצאות בקטלוג"}
                            </p>
                            {output.blockingConstraint && (
                              <button
                                type="button"
                                onClick={() => submit(output.blockingConstraint!.suggestion)}
                                className="rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-[12px] font-bold text-primary"
                              >
                                {output.blockingConstraint.suggestion}
                              </button>
                            )}
                          </div>
                        )}
                        {isComparison(output) && <ComparisonTable data={output} />}
                        {p.state === "output-error" && (
                          <p className="rounded-2xl bg-destructive/10 p-3 text-[13px] font-bold text-destructive">
                            {p.errorText ?? "החיפוש נכשל"}
                          </p>
                        )}
                      </div>
                    );
                  }

                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {busy && (
            <div className="flex items-center gap-2 text-sm font-bold">
              <Search className="h-4 w-4 text-primary" />
              <Shimmer>אני בודק עבורך את האפשרויות המתאימות ביותר…</Shimmer>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-destructive/10 p-3 text-[13px] font-bold text-destructive">
              <span>אירעה שגיאה בתקשורת עם NITZI AI. נסה שוב בעוד רגע.</span>
              <button
                type="button"
                onClick={() => {
                  clearError();
                  void regenerate();
                }}
                className="flex shrink-0 items-center gap-1 rounded-full border border-destructive/30 bg-background px-3 py-1.5 text-[12px] font-black text-destructive"
              >
                <RefreshCw className="h-3 w-3" aria-hidden /> נסה שוב
              </button>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="space-y-2 pt-2">
        <KnowledgePanel known={known} onRemove={(label) => submit(`בטל את ההעדפה: ${label}`)} />
        <QuickReplyChips known={known} onPick={submit} />
      </div>

      <div className="border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput
            onSubmit={(message) => {
              submit(message.text ?? "");
            }}
          >
            <PromptInputTextarea
              ref={textareaRef}
              dir="rtl"
              placeholder="לאן בא לך? אפשר לכתוב בחופשיות…"
            />
            <PromptInputFooter className="justify-end">
              <span className="ms-auto flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                <Wand2 className="h-3 w-3" /> ממליץ רק על חבילות אמיתיות מהקטלוג
              </span>
              <PromptInputSubmit status={status} disabled={busy} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
