// Lightweight CSV exporter — opens in Excel, no deps.
// Each row is an array of strings; headers is a parallel array of column titles.
// File downloads as <filename>.csv with UTF-8 BOM so Arabic renders correctly.

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/["\n\r,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(','))
    .join('\r\n');

  // Prepend BOM for Excel Arabic compatibility
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Convenience: export an array of row objects to CSV (Excel-compatible).
// `rows` is an array of objects; the keys of the first row become the headers.
export function exportToExcel(rows: Record<string, string | number | null | undefined>[], filename: string): void {
  if (rows.length === 0) {
    exportToCSV(filename, [], []);
    return;
  }
  const headers = Object.keys(rows[0]);
  const data = rows.map((r) => headers.map((h) => r[h] ?? ''));
  exportToCSV(filename, headers, data);
}

// Print-to-PDF via browser print dialog — opens a styled new window.
export function exportToPDF(
  title: string,
  tableHTML: string,
): void {
  const win = window.open('', '_blank', 'width=900,height=650');
  if (!win) return;
  win.document.write(`
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          * { font-family: 'Cairo', 'Tahoma', sans-serif; box-sizing: border-box; }
          body { padding: 32px; color: #1f2937; }
          h1 { color: #0c224f; font-size: 20px; margin: 0 0 4px; }
          .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #0c224f; color: #fff; text-align: right; padding: 8px 12px; font-weight: 600; }
          td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; }
          tr:nth-child(even) td { background: #f9fafb; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}</div>
        ${tableHTML}
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  win.document.close();
}
