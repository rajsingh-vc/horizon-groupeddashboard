import * as XLSX from 'xlsx';

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val == null ? '' : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ];

  const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export full drill/panel data as a ZIP of JSON + CSVs per section */
export function exportFullData(payload: {
  summary: Record<string, unknown>;
  sections: { name: string; data: unknown }[];
  filename: string;
}) {
  const { summary, sections, filename } = payload;
  const base = `${filename}_${new Date().toISOString().slice(0, 10)}`;
  const all: Record<string, unknown> = { summary, exported_at: new Date().toISOString() };
  sections.forEach(({ name, data }) => {
    all[name] = data;
  });
  exportToJSON(all, base);
}

export function exportToJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export full drill/panel data as XLSX with multiple sheets: summary, formatted data sheets with column widths */
export function exportToXLSX(payload: {
  summary: Record<string, unknown>;
  sheets: { name: string; data: Record<string, unknown>[] }[];
  filename: string;
}) {
  const { summary, sheets, filename } = payload;
  const wb = XLSX.utils.book_new();
  const base = `${filename}_${new Date().toISOString().slice(0, 10)}`;

  // Summary sheet with clean formatting
  const summaryData = [
    ['Executive Metric / Parameter', 'Report Value'],
    ...Object.entries(summary).map(([k, v]) => [k, v == null ? '—' : String(v)])
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 42 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Individual data sheets with auto-calculated column widths
  sheets.forEach(({ name, data }) => {
    if (data.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data);
      const keys = Object.keys(data[0]);
      const cols = keys.map((k) => {
        let maxLen = k.length;
        for (let i = 0; i < Math.min(data.length, 120); i++) {
          const valStr = data[i][k] != null ? String(data[i][k]) : '';
          if (valStr.length > maxLen) maxLen = valStr.length;
        }
        return { wch: Math.min(Math.max(maxLen + 4, 12), 48) };
      });
      ws['!cols'] = cols;
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    }
  });

  XLSX.writeFile(wb, `${base}.xlsx`);
}
