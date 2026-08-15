import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, ExternalLink, Mail, RotateCcw, XCircle } from "lucide-react";
import {
  AdminError,
  AdminLoading,
  ConfirmDialog,
  DataTable,
  SectionCard,
  StatusChip,
  dateTime,
  money,
} from "@/components/admin/AdminUI";
import { exportCsv } from "@/lib/admin-export";
import { adminOrderAction, adminOrders } from "@/lib/admin.functions";
import type { AdminOrder } from "@/lib/admin-types";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersPage,
});

type PendingAction = { id: string; action: "refund" | "cancel"; label: string } | null;

function OrdersPage() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingAction>(null);
  const [status, setStatus] = useState<string>("all");

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => adminOrders() as Promise<AdminOrder[]>,
    retry: false,
  });

  const act = useMutation({
    mutationFn: (v: { id: string; action: "refund" | "cancel" | "resend_email" }) =>
      adminOrderAction({ data: v }),
    onMutate: async (v) => {
      // Optimistic status update.
      await qc.cancelQueries({ queryKey: ["admin", "orders"] });
      const prev = qc.getQueryData<AdminOrder[]>(["admin", "orders"]);
      if (prev && v.action !== "resend_email") {
        qc.setQueryData<AdminOrder[]>(
          ["admin", "orders"],
          prev.map((o) =>
            o.id === v.id ? { ...o, status: v.action === "refund" ? "refunded" : "cancelled" } : o,
          ),
        );
      }
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin", "orders"], ctx.prev);
      toast.error(e.message);
    },
    onSuccess: (_r, v) =>
      toast.success(v.action === "resend_email" ? "אישור ההזמנה נשלח מחדש" : "ההזמנה עודכנה"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });

  if (isPending) return <AdminLoading />;
  if (error) return <AdminError error={error} />;

  const rows = status === "all" ? data : data.filter((o) => o.status === status);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black sm:text-3xl">ניהול הזמנות</h1>

      <SectionCard
        title="כל ההזמנות"
        subtitle={`${data.length.toLocaleString("he-IL")} הזמנות במערכת`}
        action={
          <button
            onClick={() =>
              exportCsv(
                rows.map((o) => ({
                  "מס' הזמנה": o.id,
                  לקוח: o.customer,
                  אימייל: o.email ?? "",
                  יעד: o.destination,
                  חבילה: o.dealId,
                  נוסעים: o.people,
                  לילות: o.nights,
                  סכום: o.total,
                  תשלום: o.paymentMethod ?? "",
                  סטטוס: o.status,
                  נוצר: o.createdAt,
                })),
                "nitzi-orders",
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
          >
            <Download className="h-3.5 w-3.5" /> ייצוא CSV
          </button>
        }
      >
        <DataTable<AdminOrder>
          rows={rows}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.id} ${r.customer} ${r.email ?? ""} ${r.destination} ${r.dealId}`}
          searchPlaceholder="חיפוש לפי מס׳ הזמנה, לקוח או יעד…"
          emptyTitle="לא נמצאו הזמנות"
          emptyHint="הזמנות שיבוצעו באתר יופיעו כאן."
          toolbar={
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="confirmed">מאושרות</option>
              <option value="pending">ממתינות</option>
              <option value="cancelled">בוטלו</option>
              <option value="refunded">זוכו</option>
            </select>
          }
          columns={[
            {
              key: "id",
              header: "מס׳ הזמנה",
              render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span>,
              sortValue: (r) => r.id,
            },
            {
              key: "customer",
              header: "לקוח",
              render: (r) => (
                <div>
                  <p className="font-bold">{r.customer}</p>
                  <p className="text-[11px] text-muted-foreground">{r.email ?? "—"}</p>
                </div>
              ),
              sortValue: (r) => r.customer,
            },
            {
              key: "dest",
              header: "יעד",
              render: (r) => r.destination,
              sortValue: (r) => r.destination,
            },
            {
              key: "package",
              header: "חבילה",
              render: (r) => <span className="text-xs">{r.dealId}</span>,
            },
            {
              key: "payment",
              header: "סטטוס תשלום",
              render: (r) => {
                if (r.paymentStatus === "paid") {
                  return (
                    <span className="text-xs font-bold text-emerald-700">
                      שולם{r.paymentMethod ? ` · ${r.paymentMethod}` : ""}
                    </span>
                  );
                }
                if (r.paymentStatus === "failed") {
                  return <span className="text-xs font-bold text-rose-700">חיוב נכשל</span>;
                }
                // "demo" (or any other non-paid state) — never styled like a
                // real paid order, regardless of whether a payment method
                // was recorded.
                return (
                  <span className="text-xs font-bold text-amber-800">
                    הדגמה — לא בוצע חיוב{r.paymentMethod ? ` (${r.paymentMethod})` : ""}
                  </span>
                );
              },
            },
            {
              key: "total",
              header: "סכום",
              render: (r) => money(r.total, r.currency),
              sortValue: (r) => r.total,
            },
            {
              key: "status",
              header: "סטטוס הזמנה",
              render: (r) => <StatusChip status={r.status} />,
              sortValue: (r) => r.status,
            },
            {
              key: "created",
              header: "תאריך",
              render: (r) => dateTime(r.createdAt),
              sortValue: (r) => r.createdAt,
            },
            {
              key: "actions",
              header: "פעולות",
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  <a
                    href={`/deal/${encodeURIComponent(r.dealId)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-border p-1.5"
                    title="פתח דיל"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => act.mutate({ id: r.id, action: "resend_email" })}
                    className="rounded-lg border border-border p-1.5"
                    title="שלח אישור מחדש"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      setPending({ id: r.id, action: "refund", label: "לזכות את ההזמנה?" })
                    }
                    disabled={r.status === "refunded"}
                    className="rounded-lg border border-border p-1.5 disabled:opacity-40"
                    title="זיכוי"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      setPending({ id: r.id, action: "cancel", label: "לבטל את ההזמנה?" })
                    }
                    disabled={r.status === "cancelled"}
                    className="rounded-lg border border-destructive/40 p-1.5 text-destructive disabled:opacity-40"
                    title="ביטול"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </SectionCard>

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(v) => !v && setPending(null)}
        title={pending?.label ?? ""}
        description="הפעולה תתועד ביומן הפעולות ותשנה את סטטוס ההזמנה של הלקוח."
        confirmLabel="בצע"
        destructive
        onConfirm={() => {
          if (pending) act.mutate({ id: pending.id, action: pending.action });
          setPending(null);
        }}
      />
    </div>
  );
}
