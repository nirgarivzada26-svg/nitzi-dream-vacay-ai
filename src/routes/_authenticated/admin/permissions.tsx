import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { AdminError, AdminLoading, SectionCard } from "@/components/admin/AdminUI";
import { adminPermissionMatrix, adminSetPermission } from "@/lib/admin.functions";
import {
  ADMIN_PERMISSIONS, ADMIN_ROLES, PERMISSION_LABELS, ROLE_LABELS,
  type AdminPermission, type AdminRole,
} from "@/lib/admin-types";
import { useAdminMe } from "@/lib/use-admin";

export const Route = createFileRoute("/_authenticated/admin/permissions")({
  component: PermissionsPage,
});

type MatrixRow = { role: AdminRole; permission: AdminPermission; allowed: boolean };

function PermissionsPage() {
  const qc = useQueryClient();
  const { data: me } = useAdminMe();
  const isSuper = Boolean(me?.roles.includes("super_admin"));

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => adminPermissionMatrix() as Promise<MatrixRow[]>,
    retry: false,
  });

  const setPerm = useMutation({
    mutationFn: (v: { role: AdminRole; permission: AdminPermission; allowed: boolean }) =>
      adminSetPermission({ data: v }),
    onSuccess: () => {
      toast.success("ההרשאה עודכנה");
      qc.invalidateQueries({ queryKey: ["admin", "permissions"] });
      qc.invalidateQueries({ queryKey: ["admin", "me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return <AdminLoading />;
  if (error) return <AdminError error={error} />;

  const allowed = (role: AdminRole, permission: AdminPermission) =>
    role === "super_admin" ||
    data.some((r) => r.role === role && r.permission === permission && r.allowed);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black sm:text-3xl">הרשאות ותפקידים</h1>
      <p className="text-xs text-muted-foreground">
        סופר אדמין מקבל תמיד גישה מלאה. שאר התפקידים נשלטים בטבלה — כל שינוי מתועד ביומן הפעולות.
      </p>

      {!isSuper ? (
        <p className="flex items-center gap-1.5 rounded-2xl border border-amber-400/50 bg-amber-50 p-3 text-xs font-bold text-amber-900">
          <ShieldAlert className="h-4 w-4" /> תצוגה בלבד — רק סופר אדמין יכול לשנות הרשאות.
        </p>
      ) : null}

      <SectionCard title="מטריצת הרשאות">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-right text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="p-2 font-bold">הרשאה</th>
                {ADMIN_ROLES.map((role) => (
                  <th key={role} className="p-2 font-bold">{ROLE_LABELS[role]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ADMIN_PERMISSIONS.map((permission) => (
                <tr key={permission} className="border-b border-border/60">
                  <td className="p-2 font-bold">{PERMISSION_LABELS[permission]}</td>
                  {ADMIN_ROLES.map((role) => {
                    const on = allowed(role, permission);
                    const locked = role === "super_admin" || !isSuper;
                    return (
                      <td key={role} className="p-2">
                        <button
                          onClick={() => !locked && setPerm.mutate({ role, permission, allowed: !on })}
                          disabled={locked}
                          className={`h-7 w-12 rounded-full text-[11px] font-bold transition ${
                            on ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                          } ${locked ? "opacity-60" : "hover:opacity-80"}`}
                        >
                          {on ? "מאושר" : "חסום"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
