// Shared admin UI primitives: loading / empty / error states, stat cards,
// a generic sortable + searchable + paginated data table, and a confirm dialog.

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowUpDown, Inbox, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AdminLoading({ label = "טוען נתונים…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function AdminEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm font-bold text-foreground">{title}</p>
      {hint ? <p className="max-w-md text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AdminError({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : "אירעה שגיאה בטעינת הנתונים";
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-bold">לא הצלחנו לטעון את הנתונים</p>
        <p className="text-xs opacity-80">{msg}</p>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning";
}) {
  const toneCls =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : "text-primary";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-muted-foreground sm:text-xs">{label}</p>
        {Icon ? <Icon className={cn("h-4 w-4", toneCls)} /> : null}
      </div>
      <p className="mt-2 text-xl font-black text-foreground sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-foreground sm:text-lg">{title}</h2>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchable?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyHint?: string;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  toolbar?: ReactNode;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchable,
  searchPlaceholder = "חיפוש…",
  pageSize = 12,
  emptyTitle = "אין נתונים להצגה",
  emptyHint,
  selectable,
  selected = [],
  onSelectedChange,
  toolbar,
}: DataTableProps<T>) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows;
    if (needle && searchable) out = out.filter((r) => searchable(r).toLowerCase().includes(needle));
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a),
            bv = col.sortValue!(b);
          const cmp =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv), "he");
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, q, sort, columns, searchable]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * pageSize, current * pageSize);
  const allIds = slice.map(rowKey);
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.includes(id));

  const toggle = (id: string) => {
    if (!onSelectedChange) return;
    onSelectedChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {searchable ? (
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-xl border border-border bg-background pr-9 pl-3 text-sm outline-none focus:border-primary"
            />
          </div>
        ) : null}
        {toolbar}
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty title={emptyTitle} hint={emptyHint} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-right text-sm">
              <thead className="bg-muted/50 text-[11px] text-muted-foreground">
                <tr>
                  {selectable ? (
                    <th className="w-10 p-3">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={() =>
                          onSelectedChange?.(
                            allChecked
                              ? selected.filter((s) => !allIds.includes(s))
                              : [...new Set([...selected, ...allIds])],
                          )
                        }
                      />
                    </th>
                  ) : null}
                  {columns.map((c) => (
                    <th key={c.key} className={cn("whitespace-nowrap p-3 font-bold", c.className)}>
                      {c.sortValue ? (
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={() =>
                            setSort((s) =>
                              s?.key === c.key
                                ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" }
                                : { key: c.key, dir: "asc" },
                            )
                          }
                        >
                          {c.header}
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map((row) => {
                  const id = rowKey(row);
                  return (
                    <tr key={id} className="border-t border-border/70 hover:bg-muted/30">
                      {selectable ? (
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(id)}
                            onChange={() => toggle(id)}
                          />
                        </td>
                      ) : null}
                      {columns.map((c) => (
                        <td key={c.key} className={cn("p-3 align-middle", c.className)}>
                          {c.render(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {filtered.length.toLocaleString("he-IL")} רשומות · עמוד {current} מתוך {pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
                className="rounded-lg border border-border px-3 py-1.5 font-bold disabled:opacity-40"
              >
                הקודם
              </button>
              <button
                disabled={current >= pages}
                onClick={() => setPage(current + 1)}
                className="rounded-lg border border-border px-3 py-1.5 font-bold disabled:opacity-40"
              >
                הבא
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "אישור",
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl" className="text-right">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogAction
            onClick={onConfirm}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {confirmLabel}
          </AlertDialogAction>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const money = (n: number, currency = "ILS") =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    n || 0,
  );

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });

export const dateOnly = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", { dateStyle: "medium" });

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed: { label: "מאושרת", cls: "bg-emerald-100 text-emerald-800" },
    pending: { label: "ממתינה", cls: "bg-amber-100 text-amber-900" },
    cancelled: { label: "בוטלה", cls: "bg-rose-100 text-rose-800" },
    refunded: { label: "זוכתה", cls: "bg-slate-200 text-slate-800" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.cls}`}>{s.label}</span>
  );
}
