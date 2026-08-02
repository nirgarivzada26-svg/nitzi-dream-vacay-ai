import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
  AdminError,
  AdminLoading,
  DataTable,
  SectionCard,
  dateTime,
} from "@/components/admin/AdminUI";
import { exportCsv } from "@/lib/admin-export";
import { adminAudit } from "@/lib/admin.functions";
import type { AuditRow, Paged } from "@/lib/admin-types";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditPage,
});

const PAGE_SIZE = 25;

function AuditPage() {
  const [filters, setFilters] = useState({ action: "", resource: "", actor: "", from: "", to: "" });
  const [page, setPage] = useState(1);

  const query = {
    page,
    pageSize: PAGE_SIZE,
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.resource ? { resource: filters.resource } : {}),
    ...(filters.actor ? { actor: filters.actor } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
  };

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "audit", query],
    queryFn: () => adminAudit({ data: query }) as Promise<Paged<AuditRow>>,
    placeholderData: keepPreviousData,
    retry: false,
  });

  if (isPending) return <AdminLoading />;
  if (error) return <AdminError error={error} />;

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const set = (patch: Partial<typeof filters>) => {
    setFilters({ ...filters, ...patch });
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black sm:text-3xl">יומן פעולות</h1>

      <SectionCard
        title="פעולות מנהלים"
        subtitle={`${data.total.toLocaleString("he-IL")} רשומות`}
        action={
          <button
            onClick={() =>
              exportCsv(
                data.rows.map((r) => ({
                  תאריך: r.createdAt,
                  מנהל: r.actorEmail ?? "",
                  פעולה: r.action,
                  משאב: r.resource,
                  מזהה: r.resourceId ?? "",
                  IP: r.ip ?? "",
                  לפני: r.previousValue ? JSON.stringify(r.previousValue) : "",
                  אחרי: r.newValue ? JSON.stringify(r.newValue) : "",
                })),
                "nitzi-audit",
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
          >
            <Download className="h-3.5 w-3.5" /> ייצוא CSV
          </button>
        }
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={filters.actor}
            onChange={(e) => set({ actor: e.target.value })}
            placeholder="מנהל (אימייל)"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            value={filters.action}
            onChange={(e) => set({ action: e.target.value })}
            placeholder="סוג פעולה"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            value={filters.resource}
            onChange={(e) => set({ resource: e.target.value })}
            placeholder="משאב"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            type="date"
            value={filters.from}
            onChange={(e) => set({ from: e.target.value })}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => set({ to: e.target.value })}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>

        <DataTable<AuditRow>
          rows={data.rows}
          rowKey={(r) => r.id}
          emptyTitle="לא נמצאו פעולות"
          emptyHint="שנה את הסינון או בצע פעולה כלשהי בממשק הניהול."
          columns={[
            {
              key: "created",
              header: "תאריך",
              render: (r) => dateTime(r.createdAt),
              sortValue: (r) => r.createdAt,
            },
            { key: "actor", header: "מנהל", render: (r) => r.actorEmail ?? "—" },
            {
              key: "action",
              header: "פעולה",
              render: (r) => <span className="font-bold">{r.action}</span>,
            },
            {
              key: "resource",
              header: "משאב",
              render: (r) =>
                `${r.resource}${r.resourceId ? ` · ${r.resourceId.slice(0, 12)}` : ""}`,
            },
            {
              key: "before",
              header: "לפני",
              render: (r) =>
                r.previousValue ? (
                  <code dir="ltr" className="text-[11px]">
                    {JSON.stringify(r.previousValue).slice(0, 60)}
                  </code>
                ) : (
                  "—"
                ),
            },
            {
              key: "after",
              header: "אחרי",
              render: (r) =>
                r.newValue ? (
                  <code dir="ltr" className="text-[11px]">
                    {JSON.stringify(r.newValue).slice(0, 60)}
                  </code>
                ) : (
                  "—"
                ),
            },
            { key: "ip", header: "IP", render: (r) => <span dir="ltr">{r.ip ?? "—"}</span> },
          ]}
        />

        <div className="mt-3 flex items-center justify-between text-xs font-bold">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-xl border border-border px-3 py-2 disabled:opacity-40"
          >
            הקודם
          </button>
          <span>
            עמוד {page} מתוך {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="rounded-xl border border-border px-3 py-2 disabled:opacity-40"
          >
            הבא
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
