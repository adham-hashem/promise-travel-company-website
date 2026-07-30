import * as XLSX from 'xlsx';

/**
 * Exports data to an Excel file (.xlsx) using the existing xlsx library.
 * @param data Array of objects representing the rows.
 * @param filename Name of the file without extension.
 */
export const exportToExcel = (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Exports data to PDF by opening a beautifully styled print window.
 * This utilizes the browser's PDF engine which perfectly renders RTL and shaped Arabic letters.
 * @param title Document title shown at the top.
 * @param headers Array of header column labels.
 * @param rows Matrix of row cells corresponding to the headers.
 */
export const exportToPDF = (title: string, headers: string[], rows: any[][]) => {
  const win = window.open('', '_blank');
  if (!win) return;

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0c224f; }
        .header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #c9941a; padding-bottom: 10px; }
        h1 { font-size: 20px; margin: 0; }
        .btn-print { padding: 8px 16px; background: #0c224f; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: inherit; }
        .btn-print:hover { background: #c9941a; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; text-align: right; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 10px; }
        th { background-color: #f1f5f9; font-weight: 850; color: #0c224f; }
        tr:nth-child(even) { background-color: #f8fafc; }
        @media print {
          body { padding: 0; }
          .btn-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header-container">
        <h1>${title}</h1>
        <button class="btn-print" onclick="window.print()">طباعة / حفظ كـ PDF</button>
      </div>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${row.map(cell => `<td>${cell !== null && cell !== undefined ? cell : '—'}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 300);
        }
      </script>
    </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();
};
