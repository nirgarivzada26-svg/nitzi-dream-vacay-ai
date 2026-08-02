import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plane, Power } from "lucide-react";
import {
  AdminError,
  AdminLoading,
  DataTable,
  SectionCard,
  StatCard,
  dateTime,
  money,
} from "@/components/admin/AdminUI";
import { adminFlights, adminSetFlightEnabled } from "@/lib/admin.functions";
import type { AdminFlightRow } from "@/lib/admin-types";

export const Route = createFileRoute("/_authenticated/admin/flights")({
  component: FlightsPage,
});

function FlightsPage() {
  const qc = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "flights"],
    queryFn: () => adminFlights() as Promise<AdminFlightRow[]>,
    retry: false,
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => adminSetFlightEnabled({ data: v }),
    onSuccess: () => {
      toast.success("סטטוס הטיסה עודכן");
      qc.invalidateQueries({ queryKey: ["admin", "flights"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return <AdminLoading />;
  if (error) return <AdminError error={error} />;

  const providers = Array.from(new Set(data.map((f) => f.provider)));
  const enabled = data.filter((f) => f.enabled).length;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black sm:text-3xl">ניהול טיסות</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="מסלולים במלאי" value={data.length.toLocaleString("he-IL")} icon={Plane} />
        <StatCard
          label="מסלולים פעילים"
          value={enabled.toLocaleString("he-IL")}
          icon={Power}
          tone="success"
        />
        <StatCard label="ספקים מחוברים" value={providers.length.toLocaleString("he-IL")} />
        <StatCard label="עדכון אחרון" value={data[0] ? dateTime(data[0].lastUpdate) : "—"} />
      </div>

      <SectionCard title="סטטוס ספקים" subtitle="מקור המלאי כפי שמוגדר בשכבת ה-Providers">
        <div className="flex flex-wrap gap-2">
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">לא מחובר ספק טיסות פעיל.</p>
          ) : (
            providers.map((p) => (
              <span
                key={p}
                className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"
              >
                {p} · מחובר
              </span>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard title="מסלולי טיסה" subtitle={`${data.length.toLocaleString("he-IL")} מסלולים`}>
        <DataTable<AdminFlightRow>
          rows={data}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.route} ${r.provider} ${r.cabin}`}
          searchPlaceholder="חיפוש מסלול או ספק…"
          emptyTitle="אין מלאי טיסות"
          emptyHint="חבר ספק טיסות כדי לראות מסלולים."
          columns={[
            {
              key: "route",
              header: "מסלול",
              render: (r) => <span className="font-bold">{r.route}</span>,
              sortValue: (r) => r.route,
            },
            {
              key: "provider",
              header: "ספק",
              render: (r) => r.provider,
              sortValue: (r) => r.provider,
            },
            {
              key: "depart",
              header: "המראה",
              render: (r) => dateTime(r.departAt),
              sortValue: (r) => r.departAt,
            },
            { key: "arrive", header: "נחיתה", render: (r) => dateTime(r.arriveAt) },
            {
              key: "stops",
              header: "עצירות",
              render: (r) => (r.stops === 0 ? "ישירה" : `${r.stops}`),
              sortValue: (r) => r.stops,
            },
            { key: "cabin", header: "מחלקה", render: (r) => r.cabin },
            {
              key: "price",
              header: "מחיר",
              render: (r) => money(r.price),
              sortValue: (r) => r.price,
            },
            { key: "updated", header: "עודכן", render: (r) => dateTime(r.lastUpdate) },
            {
              key: "enabled",
              header: "פעיל",
              render: (r) => (
                <button
                  onClick={() => toggle.mutate({ id: r.id, enabled: !r.enabled })}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${r.enabled ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}
                >
                  {r.enabled ? "פעיל" : "מושבת"}
                </button>
              ),
              sortValue: (r) => (r.enabled ? 1 : 0),
            },
          ]}
        />
      </SectionCard>
    </div>
  );
}
