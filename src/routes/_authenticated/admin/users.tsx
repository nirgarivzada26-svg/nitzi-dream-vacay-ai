import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, ShieldCheck, UserCheck, UserX } from "lucide-react";
import {
  AdminError, AdminLoading, ConfirmDialog, DataTable, SectionCard, dateTime, money,
} from "@/components/admin/AdminUI";
import { exportCsv } from "@/lib/admin-export";
import { adminUserAction, adminUsers } from "@/lib/admin.functions";
import { ADMIN_ROLES, ROLE_LABELS, type AdminRole, type AdminUserRow } from "@/lib/admin-types";
import { useAdminMe } from "@/lib/use-admin";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const { data: me } = useAdminMe();
  const isSuper = Boolean(me?.roles.includes("super_admin"));
  const [pending, setPending] = useState<{ id: string; active: boolean } | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminUsers() as Promise<AdminUserRow[]>,
    retry: false,
  });

  const act = useMutation({
    mutationFn: (v: { userId: string; action: "deactivate" | "reactivate" | "set_role" | "unset_role"; role?: AdminRole }) =>
      adminUserAction({ data: v }),
    onSuccess: () => {
      toast.success("המשתמש עודכן");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return <AdminLoading />;
  if (error) return <AdminError error={error} />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black sm:text-3xl">ניהול משתמשים</h1>

      <SectionCard
        title="כל המשתמשים"
        subtitle={`${data.length.toLocaleString("he-IL")} משתמשים רשומים`}
        action={
          <button
            onClick={() =>
              exportCsv(
                data.map((u) => ({
                  שם: u.name, אימייל: u.email ?? "", טלפון: u.phone ?? "", הרשמה: u.createdAt,
                  הזמנות: u.orders, מועדפים: u.favorites, "סה\"כ רכישות": u.spend,
                  תפקידים: u.roles.join("|"), פעיל: u.active ? "כן" : "לא",
                })),
                "nitzi-users",
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
          >
            <Download className="h-3.5 w-3.5" /> ייצוא CSV
          </button>
        }
      >
        <DataTable<AdminUserRow>
          rows={data}
          rowKey={(r) => r.id}
          searchable={(r) => `${r.name} ${r.email ?? ""} ${r.phone ?? ""}`}
          searchPlaceholder="חיפוש לפי שם, אימייל או טלפון…"
          emptyTitle="אין עדיין משתמשים רשומים"
          columns={[
            { key: "name", header: "שם", render: (r) => (<div><p className="font-bold">{r.name}</p>{r.roles.length ? <p className="text-[11px] text-primary">{r.roles.map((x) => ROLE_LABELS[x]).join(", ")}</p> : null}</div>), sortValue: (r) => r.name },
            { key: "email", header: "אימייל", render: (r) => r.email ?? "—", sortValue: (r) => r.email ?? "" },
            { key: "phone", header: "טלפון", render: (r) => r.phone ?? "—" },
            { key: "created", header: "תאריך הרשמה", render: (r) => dateTime(r.createdAt), sortValue: (r) => r.createdAt },
            { key: "orders", header: "הזמנות", render: (r) => r.orders, sortValue: (r) => r.orders },
            { key: "fav", header: "מועדפים", render: (r) => r.favorites, sortValue: (r) => r.favorites },
            { key: "spend", header: "סה״כ רכישות", render: (r) => money(r.spend), sortValue: (r) => r.spend },
            {
              key: "actions",
              header: "פעולות",
              render: (r) => (
                <div className="flex flex-wrap items-center gap-1">
                  {isSuper ? (
                    <select
                      value=""
                      onChange={(e) => {
                        const role = e.target.value as AdminRole;
                        if (!role) return;
                        act.mutate({
                          userId: r.id,
                          action: r.roles.includes(role) ? "unset_role" : "set_role",
                          role,
                        });
                        e.target.value = "";
                      }}
                      className="h-8 rounded-lg border border-border bg-background px-2 text-[11px]"
                      title="שיוך תפקיד"
                    >
                      <option value="">תפקיד…</option>
                      {ADMIN_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {r.roles.includes(role) ? `הסר ${ROLE_LABELS[role]}` : `הוסף ${ROLE_LABELS[role]}`}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <button
                    onClick={() => setPending({ id: r.id, active: !r.active })}
                    className={`rounded-lg border p-1.5 ${r.active ? "border-destructive/40 text-destructive" : "border-border"}`}
                    title={r.active ? "השבתה" : "הפעלה מחדש"}
                  >
                    {r.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </SectionCard>

      {!isSuper ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> שיוך תפקידים זמין לסופר אדמין בלבד.
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(v) => !v && setPending(null)}
        title={pending?.active ? "להפעיל את המשתמש מחדש?" : "להשבית את המשתמש?"}
        description="משתמש מושבת לא יוכל להתחבר לחשבון עד להפעלה מחדש."
        destructive={!pending?.active}
        onConfirm={() => {
          if (pending) act.mutate({ userId: pending.id, action: pending.active ? "reactivate" : "deactivate" });
          setPending(null);
        }}
      />
    </div>
  );
}
