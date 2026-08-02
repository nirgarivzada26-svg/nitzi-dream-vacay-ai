import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, Copy, Download, ExternalLink, Star, Trash2 } from "lucide-react";
import {
  AdminError, AdminLoading, ConfirmDialog, DataTable, SectionCard, money,
} from "@/components/admin/AdminUI";
import { exportCsv } from "@/lib/admin-export";
import { adminPackageAction, adminPackages } from "@/lib/admin.functions";
import { boardLabels, type BoardBasis } from "@/lib/deals";
import type { AdminPackageRow } from "@/lib/admin-types";

export const Route = createFileRoute("/_authenticated/admin/packages")({
  component: PackagesPage,
});

const SMART: Record<AdminPackageRow["smartPrice"], { label: string; cls: string }> = {
  great: { label: "🟢 מחיר מצוין", cls: "bg-emerald-100 text-emerald-800" },
  fair: { label: "🟡 מחיר רגיל", cls: "bg-amber-100 text-amber-900" },
  wait: { label: "🔴 כדאי להמתין", cls: "bg-rose-100 text-rose-800" },
  unknown: { label: "—", cls: "bg-muted text-muted-foreground" },
};

function PackagesPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ action: "delete" | "archive"; slugs: string[] } | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "packages"],
    queryFn: () => adminPackages() as Promise<AdminPackageRow[]>,
    retry: false,
  });

  const act = useMutation({
    mutationFn: (v: { action: "archive" | "activate" | "delete" | "duplicate" | "feature" | "unfeature"; slugs: string[] }) =>
      adminPackageAction({ data: v }),
    onSuccess: () => {
      toast.success("החבילות עודכנו");
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["admin", "packages"] });
      qc.invalidateQueries({ queryKey: ["destinations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return <AdminLoading />;
  if (error) return <AdminError error={error} />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black sm:text-3xl">ניהול חבילות</h1>
      <p className="text-xs text-muted-foreground">
        כל חבילה נבנית מיעד פעיל בקטלוג. שדות המלון, המחיר וההרכב מגיעים משכבת הספקים — צפיות, הזמנות
        ושיעור המרה נמדדים מנתוני אמת באתר.
      </p>

      <SectionCard
        title="חבילות"
        subtitle={`${data.length.toLocaleString("he-IL")} חבילות`}
        action={
          <button
            onClick={() =>
              exportCsv(
                data.map((p) => ({
                  כותרת: p.name, יעד: p.destination, מדינה: p.country, מלון: p.hotel ?? "",
                  מחיר: p.price, "מחיר קודם": p.previousPrice ?? "", כוכבים: p.stars ?? "",
                  בסיס: p.board ?? "", סטטוס: p.active ? "פעילה" : "בארכיון",
                  "ציון NITZI": p.nitziScore, צפיות: p.views, הזמנות: p.orders, המרה: p.conversionRate,
                })),
                "nitzi-packages",
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
          >
            <Download className="h-3.5 w-3.5" /> ייצוא CSV
          </button>
        }
      >
        <DataTable<AdminPackageRow>
          rows={data}
          rowKey={(r) => r.slug}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          searchable={(r) => `${r.name} ${r.destination} ${r.country} ${r.hotel ?? ""}`}
          searchPlaceholder="חיפוש חבילה, יעד או מלון…"
          emptyTitle="אין חבילות בקטלוג"
          toolbar={
            selected.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted px-3 py-1.5 text-xs font-bold">
                <span>{selected.length} נבחרו</span>
                <button onClick={() => act.mutate({ action: "activate", slugs: selected })} className="rounded-lg border border-border bg-background px-2 py-1">הפעלה</button>
                <button onClick={() => setConfirm({ action: "archive", slugs: selected })} className="rounded-lg border border-border bg-background px-2 py-1">ארכיון</button>
                <button onClick={() => act.mutate({ action: "feature", slugs: selected })} className="rounded-lg border border-border bg-background px-2 py-1">הצג בדף הבית</button>
                <button onClick={() => act.mutate({ action: "unfeature", slugs: selected })} className="rounded-lg border border-border bg-background px-2 py-1">הסר מדף הבית</button>
                <button onClick={() => setConfirm({ action: "delete", slugs: selected })} className="rounded-lg border border-destructive/40 px-2 py-1 text-destructive">מחיקה</button>
              </div>
            ) : null
          }
          columns={[
            { key: "name", header: "כותרת", render: (r) => (<div><p className="font-bold">{r.name}</p><p className="text-[11px] text-muted-foreground">{r.destination} · {r.country}</p></div>), sortValue: (r) => r.name },
            { key: "hotel", header: "מלון", render: (r) => r.hotel ?? "—" },
            { key: "price", header: "מחיר", render: (r) => (r.price ? money(r.price) : "—"), sortValue: (r) => r.price },
            { key: "prev", header: "מחיר קודם", render: (r) => (r.previousPrice ? <span className="text-xs text-muted-foreground line-through">{money(r.previousPrice)}</span> : "—") },
            { key: "stars", header: "כוכבים", render: (r) => (r.stars ? `${r.stars}★` : "—"), sortValue: (r) => r.stars ?? 0 },
            { key: "board", header: "בסיס אירוח", render: (r) => (r.board ? boardLabels[r.board as BoardBasis] ?? r.board : "—") },
            { key: "pool", header: "בריכה", render: (r) => (r.pool ? "כן" : "—") },
            { key: "beach", header: "מרחק מהחוף", render: (r) => r.beachDistance ?? "—" },
            { key: "status", header: "סטטוס", render: (r) => (<span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{r.active ? "פעילה" : "בארכיון"}</span>), sortValue: (r) => (r.active ? 1 : 0) },
            { key: "score", header: "ציון NITZI", render: (r) => (r.nitziScore ? r.nitziScore : "—"), sortValue: (r) => r.nitziScore },
            { key: "smart", header: "מחיר חכם", render: (r) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${SMART[r.smartPrice].cls}`}>{SMART[r.smartPrice].label}</span> },
            { key: "views", header: "צפיות", render: (r) => r.views, sortValue: (r) => r.views },
            { key: "orders", header: "הזמנות", render: (r) => r.orders, sortValue: (r) => r.orders },
            { key: "cr", header: "המרה", render: (r) => `${r.conversionRate}%`, sortValue: (r) => r.conversionRate },
            {
              key: "actions",
              header: "פעולות",
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  <a href={`/deal/${r.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-border p-1.5" title="צפייה"><ExternalLink className="h-3.5 w-3.5" /></a>
                  <button onClick={() => act.mutate({ action: r.featured ? "unfeature" : "feature", slugs: [r.slug] })} className={`rounded-lg border p-1.5 ${r.featured ? "border-amber-400 text-amber-600" : "border-border"}`} title="מומלץ בדף הבית"><Star className="h-3.5 w-3.5" /></button>
                  <button onClick={() => act.mutate({ action: "duplicate", slugs: [r.slug] })} className="rounded-lg border border-border p-1.5" title="שכפול"><Copy className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setConfirm({ action: "archive", slugs: [r.slug] })} className="rounded-lg border border-border p-1.5" title="ארכיון"><Archive className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setConfirm({ action: "delete", slugs: [r.slug] })} className="rounded-lg border border-destructive/40 p-1.5 text-destructive" title="מחיקה"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ),
            },
          ]}
        />
      </SectionCard>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.action === "delete" ? "למחוק את החבילות שנבחרו?" : "להעביר לארכיון?"}
        description={
          confirm?.action === "delete"
            ? "המחיקה סופית ותסיר את היעד מהקטלוג ומהאתר."
            : "החבילה תוסתר מהאתר אך תישאר במערכת."
        }
        destructive
        onConfirm={() => {
          if (confirm) act.mutate({ action: confirm.action, slugs: confirm.slugs });
          setConfirm(null);
        }}
      />
    </div>
  );
}
