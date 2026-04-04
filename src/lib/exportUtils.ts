export function exportCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportPDF(title: string, headers: string[], rows: (string | number)[][]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const table = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12px">
    <thead><tr style="background:#1a365d;color:#fff">${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r, i) => `<tr style="background:${i % 2 ? "#f7fafc" : "#fff"}">${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>@media print{body{margin:0}}</style></head><body>
    <h2 style="font-family:Arial;color:#1a365d">${title}</h2>
    <p style="font-family:Arial;font-size:11px;color:#666">Generated: ${new Date().toLocaleString()}</p>
    ${table}
    <p style="font-family:Arial;font-size:10px;color:#999;margin-top:20px">© 2026 Gem School Management</p>
  </body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

export function printTable(title: string, headers: string[], rows: (string | number)[][]) {
  exportPDF(title, headers, rows);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
