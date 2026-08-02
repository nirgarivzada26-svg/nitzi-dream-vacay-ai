import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { AdminError, AdminLoading, SectionCard, dateTime } from "@/components/admin/AdminUI";
import { adminSaveSetting, adminSettings } from "@/lib/admin.functions";
import type { SettingRow } from "@/lib/admin-types";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

const LABELS: Record<string, { label: string; hint: string }> = {
  default_origin_airport: {
    label: "שדה תעופה ברירת מחדל",
    hint: "קוד IATA שממולא אוטומטית בחיפוש (למשל TLV)",
  },
  commission_pct: { label: "אחוז עמלה", hint: "העמלה שנלקחת מכל הזמנה" },
  featured_deal_slugs: {
    label: "דילים מקודמים",
    hint: "רשימת יעדים שמוצגים בראש דף הבית (מופרדים בפסיק)",
  },
  support_email: { label: "אימייל תמיכה", hint: "כתובת שמופיעה באישורי הזמנה" },
  currency: { label: "מטבע ברירת מחדל", hint: "מטבע התצוגה באתר" },
};

function toText(v: SettingRow["value"]): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map((x) => String(x)).join(", ");
  return JSON.stringify(v);
}

function fromText(original: SettingRow["value"], text: string): unknown {
  if (typeof original === "number") return Number(text);
  if (typeof original === "boolean") return text === "true";
  if (Array.isArray(original))
    return text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  if (original && typeof original === "object") {
    try {
      return JSON.parse(text);
    } catch {
      return original;
    }
  }
  return text;
}

function SettingsPage() {
  const qc = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => adminSettings() as Promise<SettingRow[]>,
    retry: false,
  });
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.map((s) => [s.key, toText(s.value)])));
  }, [data]);

  const save = useMutation({
    mutationFn: (v: { key: string; value: unknown }) => adminSaveSetting({ data: v }),
    onSuccess: () => {
      toast.success("ההגדרה נשמרה");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return <AdminLoading />;
  if (error) return <AdminError error={error} />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black sm:text-3xl">הגדרות מערכת</h1>

      <SectionCard title="הגדרות כלליות" subtitle="שינוי מתועד ביומן הפעולות">
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((s) => {
            const meta = LABELS[s.key] ?? { label: s.key, hint: "" };
            const value = draft[s.key] ?? "";
            const dirty = value !== toText(s.value);
            const isBool = typeof s.value === "boolean";
            return (
              <div key={s.key} className="rounded-2xl border border-border bg-card p-4">
                <label className="text-sm font-black" htmlFor={`setting-${s.key}`}>
                  {meta.label}
                </label>
                {meta.hint ? (
                  <p className="mb-2 text-[11px] text-muted-foreground">{meta.hint}</p>
                ) : (
                  <div className="mb-2" />
                )}
                <div className="flex items-center gap-2">
                  {isBool ? (
                    <select
                      id={`setting-${s.key}`}
                      value={value}
                      onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                      className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
                    >
                      <option value="true">פעיל</option>
                      <option value="false">כבוי</option>
                    </select>
                  ) : (
                    <input
                      id={`setting-${s.key}`}
                      value={value}
                      onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                      className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
                    />
                  )}
                  <button
                    onClick={() => save.mutate({ key: s.key, value: fromText(s.value, value) })}
                    disabled={!dirty || save.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5" /> שמירה
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  עודכן לאחרונה · {dateTime(s.updatedAt)} {s.isPublic ? "· ציבורי" : "· פנימי"}
                </p>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
