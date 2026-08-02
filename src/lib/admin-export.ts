// Report exports. All exports are built from data already loaded in the page —
// nothing is fabricated. CSV and Excel download directly; PDF opens the print
// dialog with a print-ready table (browser "Save as PDF").

export type Row = Record<string, string | number | null | undefined>;

function download(content: BlobPart, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function exportCsv(rows: Row[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const body = rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
  // BOM keeps Hebrew readable in Excel.
  download("\uFEFF" + headers.map(esc).join(",") + "\n" + body, `${filename}.csv`, "text/csv;charset=utf-8");
}

export function exportExcel(rows: Row[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const html = `<html dir="rtl"><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${headers
    .map((h) => `<th>${h}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></body></html>`;
  download(html, `${filename}.xls`, "application/vnd.ms-excel");
}

export function exportPdf(rows: Row[], filename: string, title: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<html dir="rtl" lang="he"><head><meta charset="utf-8"><title>${filename}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px}h1{font-size:20px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #ddd;padding:6px;text-align:right}th{background:#f5f5f5}</style></head>
    <body><h1>${title}</h1><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
