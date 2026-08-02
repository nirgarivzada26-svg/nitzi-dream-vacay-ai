// Booking documents (confirmation / voucher / invoice).
//
// One builder shared by checkout and "manage booking", so a document produced
// right after payment is byte-identical to the one downloaded later from the
// account area. Everything printed comes from the stored booking snapshot —
// nothing is re-invented at print time. The file opens as a print-ready page
// (Ctrl/Cmd + P → Save as PDF).

export type DocumentKind = "confirmation" | "voucher" | "invoice";

export interface DocumentBooking {
  id: string;
  destination_name: string;
  start_date: string;
  end_date: string;
  nights: number;
  people: number;
  price_per_person: number;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
  snapshot: unknown;
}

const TITLES: Record<DocumentKind, string> = {
  confirmation: "אישור הזמנה",
  voucher: "שובר נסיעה (Voucher)",
  invoice: "חשבונית עסקה",
};

const fmtILS = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;
const fmtDate = (v: string) => new Date(v).toLocaleDateString("he-IL");

export function bookingRef(id: string) {
  return id.slice(0, 8).toUpperCase();
}

interface Snap {
  hotel?: { name?: string; stars?: number };
  outbound?: { airline?: string; flightNumber?: string; departAt?: string };
  inbound?: { airline?: string; flightNumber?: string; departAt?: string };
  board?: string;
  destination?: { country?: string };
  booking?: {
    passengers?: { firstName?: string; lastName?: string }[];
    contact?: { email?: string; phone?: string };
    extras?: { label: string; amount: number }[];
    extrasTotal?: number;
    payment?: { method?: string };
  };
}

const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );

/** Rows we can prove from the snapshot. Missing data is skipped, never faked. */
function factRows(b: DocumentBooking, snap: Snap): [string, string][] {
  const rows: [string, string][] = [
    ["מספר הזמנה", bookingRef(b.id)],
    ["יעד", [b.destination_name, snap.destination?.country].filter(Boolean).join(", ")],
    ["תאריכים", `${fmtDate(b.start_date)} – ${fmtDate(b.end_date)} (${b.nights} לילות)`],
    ["נוסעים", String(b.people)],
  ];
  if (snap.hotel?.name) rows.push(["מלון", snap.hotel.name]);
  if (snap.outbound?.airline) {
    rows.push([
      "טיסת הלוך",
      `${snap.outbound.airline} ${snap.outbound.flightNumber ?? ""}`.trim(),
    ]);
  }
  if (snap.inbound?.airline) {
    rows.push(["טיסת חזור", `${snap.inbound.airline} ${snap.inbound.flightNumber ?? ""}`.trim()]);
  }
  const names = (snap.booking?.passengers ?? [])
    .map((p) => `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim())
    .filter(Boolean);
  if (names.length) rows.push(["שמות נוסעים", names.join(", ")]);
  if (snap.booking?.contact?.email) rows.push(["איש קשר", snap.booking.contact.email]);
  rows.push(["הופק בתאריך", new Date().toLocaleString("he-IL")]);
  return rows;
}

export function buildBookingDocument(b: DocumentBooking, kind: DocumentKind): string {
  const snap = (b.snapshot ?? {}) as Snap;
  const extras = snap.booking?.extras ?? [];
  const extrasTotal = snap.booking?.extrasTotal ?? 0;
  const base = b.total_price - extrasTotal;
  const cancelled = b.status === "cancelled";

  const rows = factRows(b, snap)
    .map(
      ([k, v]) =>
        `<tr><th style="text-align:right;padding:8px 0;color:#64748b;font-weight:600;width:180px">${esc(k)}</th><td style="padding:8px 0;font-weight:700">${esc(v)}</td></tr>`,
    )
    .join("");

  const priceRows = [
    [`חבילה · ${b.people} נוסעים × ${fmtILS(b.price_per_person)}`, fmtILS(base)],
    ...extras.map((e) => [e.label, fmtILS(e.amount)] as [string, string]),
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0">${esc(k)}</td><td style="padding:6px 0;text-align:left;font-weight:700">${esc(v)}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8">
<title>NITZI · ${TITLES[kind]} ${bookingRef(b.id)}</title>
<style>
 body{font-family:system-ui,'Segoe UI',Arial;margin:0;padding:40px;color:#0f172a;background:#fff}
 .wrap{max-width:720px;margin:0 auto}
 .brand{font-size:30px;font-weight:900;letter-spacing:-1px}
 .tag{color:#64748b;font-size:13px;margin-top:2px}
 .card{border:1px solid #e2e8f0;border-radius:18px;padding:22px;margin-top:22px}
 h2{font-size:16px;margin:0 0 10px}
 table{width:100%;border-collapse:collapse;font-size:14px}
 .total{display:flex;justify-content:space-between;border-top:2px solid #0f172a;margin-top:12px;padding-top:12px;font-size:19px;font-weight:900}
 .stamp{display:inline-block;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:800;background:${cancelled ? "#fee2e2;color:#991b1b" : "#dcfce7;color:#166534"}}
 .foot{color:#94a3b8;font-size:11px;margin-top:26px;line-height:1.7}
 @media print{body{padding:0}.card{break-inside:avoid}}
</style></head><body><div class="wrap">
 <div class="brand">NITZI</div>
 <div class="tag">החיים קצרים. תצא לחוות.</div>
 <div class="card">
   <h2>${TITLES[kind]}</h2>
   <span class="stamp">${cancelled ? "הזמנה מבוטלת" : "הזמנה מאושרת"}</span>
   <table style="margin-top:14px">${rows}</table>
 </div>
 <div class="card">
   <h2>פירוט תשלום</h2>
   <table>${priceRows}</table>
   <div class="total"><span>סה״כ ${esc(b.currency)}</span><span>${fmtILS(b.total_price)}</span></div>
 </div>
 <p class="foot">
   מסמך זה הופק אוטומטית על ידי NITZI עבור הזמנה ${bookingRef(b.id)}.<br>
   לשמירה כ-PDF: פתחו את הקובץ ולחצו Ctrl/Cmd + P → "שמור כ-PDF".<br>
   ${kind === "voucher" ? "הציגו שובר זה בדלפק הקבלה של המלון ובעמדת הצ׳ק-אין." : ""}
 </p>
</div></body></html>`;
}

/** Triggers a browser download of a generated booking document. */
export function downloadBookingDocument(b: DocumentBooking, kind: DocumentKind) {
  const html = buildBookingDocument(b, kind);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `nitzi-${kind}-${bookingRef(b.id)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
