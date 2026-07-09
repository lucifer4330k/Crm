'use client';

interface CSVPreviewProps {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

const MAX_PREVIEW_ROWS = 20;

export default function CSVPreview({ headers, rows, totalRows }: CSVPreviewProps) {
  const previewRows = rows.slice(0, MAX_PREVIEW_ROWS);
  const remaining = totalRows - MAX_PREVIEW_ROWS;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4" style={{ justifyContent: 'space-between' }}>
        <div>
          <p className="card-title" style={{ fontSize: '16px' }}>CSV Preview</p>
          <p className="card-subtitle" style={{ fontSize: '13px' }}>
            {headers.length} columns · {totalRows} rows total
            {totalRows > MAX_PREVIEW_ROWS && ` (showing first ${MAX_PREVIEW_ROWS})`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-blue">{headers.length} cols</span>
          <span className="badge badge-purple">{totalRows} rows</span>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '48px', textAlign: 'center' }}>#</th>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                  {i + 1}
                </td>
                {headers.map((h) => (
                  <td key={h} title={row[h] || ''}>
                    {row[h] || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {remaining > 0 && (
        <p className="mt-4" style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
          + {remaining} more rows will be processed
        </p>
      )}
    </div>
  );
}