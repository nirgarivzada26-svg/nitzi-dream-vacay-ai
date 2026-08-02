import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { deleteConversation, listConversations, type ConversationRow } from "@/lib/ai-conversations";
import { useAuth } from "@/lib/auth";

export function ConversationSidebar({ activeId }: { activeId?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ConversationRow[]>([]);

  useEffect(() => {
    if (!user) { setRows([]); return; }
    let alive = true;
    listConversations()
      .then((r) => { if (alive) setRows(r); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [user, activeId]);

  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-s border-border/60 bg-card/40 lg:flex" dir="rtl">
      <div className="p-4">
        <Link
          to="/ai"
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-sunset px-4 py-3 text-sm font-black text-white shadow-glow"
        >
          <MessageSquarePlus className="h-4 w-4" /> שיחה חדשה
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {!user && (
          <p className="rounded-2xl border border-dashed border-border p-4 text-[12px] font-bold text-muted-foreground">
            התחבר כדי לשמור שיחות ולחזור אליהן בהמשך.
          </p>
        )}
        {user && rows.length === 0 && (
          <p className="px-2 text-[12px] font-bold text-muted-foreground">אין עדיין שיחות שמורות.</p>
        )}
        <ul className="space-y-1">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`group flex items-center gap-1 rounded-2xl px-2 ${
                row.id === activeId ? "bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
            >
              <Link
                to="/ai/$conversationId"
                params={{ conversationId: row.id }}
                className="min-w-0 flex-1 truncate py-2.5 text-right text-[13px] font-bold"
              >
                {row.title}
              </Link>
              <button
                type="button"
                aria-label="מחק שיחה"
                onClick={async () => {
                  await deleteConversation(row.id);
                  setRows((prev) => prev.filter((r) => r.id !== row.id));
                  if (row.id === activeId) navigate({ to: "/ai" });
                }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted-foreground opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
