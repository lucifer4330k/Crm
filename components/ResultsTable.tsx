'use client';

import { useState } from 'react';
import { CRMRecord, ProcessingResult, SkippedRecord } from '@/lib/types';
import { Button } from '@/components/ui/Button';

interface ResultsTableProps {
  result: ProcessingResult;
  onReset: () => void;
}

const CRM_STATUS_LABELS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: '✅ Good Lead',
  DID_NOT_CONNECT:     '📵 No Connect',
  BAD_LEAD:            '❌ Bad Lead',
  SALE_DONE:           '🎉 Sale Done',
  '':                  '— Unknown',
};

const CRM_STATUS_CLASS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: 'badge-success',
  DID_NOT_CONNECT:     'badge-amber',
  BAD_LEAD:            'badge-danger',
  SALE_DONE:           'badge-blue',
  '':                  '',
};

function downloadCSV(records: CRMRecord[], filename: string) {
  if (records.length === 0) return;
  const headers = Object.keys(records[0]) as (keyof CRMRecord)[];
  const rows = records.map((r) =>
    headers.map((h) => {
      let val = r[h] || '';
      // Sanitize formula injection
      if (/^[=+\-@]/.test(val)) {
        val = "'" + val;
      }
      // Escape line breaks as per assignment instructions to keep it on a single line
      val = val.replace(/\r?\n/g, '\\n');
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SuccessTable({ records }: { records: CRMRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <p className="empty-state-text">No records were successfully mapped</p>
      </div>
    );
  }

  const CRM_COLS: (keyof CRMRecord)[] = [
    'name', 'email', 'mobile_without_country_code', 'country_code',
    'company', 'city', 'state', 'country',
    'crm_status', 'crm_note', 'data_source',
    'lead_owner', 'created_at', 'possession_time', 'description',
  ];

  return (
    <div className="table-container" style={{ maxHeight: '480px', overflowY: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '40px', textAlign: 'center' }}>#</th>
            {CRM_COLS.map((col) => (
              <th key={col}>{col.replace(/_/g, ' ')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((rec, i) => (
            <tr key={i}>
              <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>{i + 1}</td>
              {CRM_COLS.map((col) => (
                <td key={col} title={rec[col] || ''}>
                  {col === 'crm_status' ? (
                    <span className={`badge ${CRM_STATUS_CLASS[rec.crm_status] || ''}`}>
                      {CRM_STATUS_LABELS[rec.crm_status] || rec.crm_status || '—'}
                    </span>
                  ) : (
                    rec[col] || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkippedTable({ records }: { records: SkippedRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🎯</div>
        <p className="empty-state-text">No records were skipped — perfect!</p>
      </div>
    );
  }

  const firstRecord = records[0];
  const originalHeaders = Object.keys(firstRecord.originalData);

  return (
    <div className="table-container" style={{ maxHeight: '480px', overflowY: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '40px', textAlign: 'center' }}>#</th>
            <th style={{ minWidth: '200px' }}>Reason</th>
            {originalHeaders.slice(0, 6).map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((rec, i) => (
            <tr key={i}>
              <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>{i + 1}</td>
              <td>
                <span className="badge badge-danger">{rec.reason}</span>
              </td>
              {originalHeaders.slice(0, 6).map((h) => (
                <td key={h} title={String(rec.originalData[h] || '')}>
                  {rec.originalData[h] ? String(rec.originalData[h]) : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ResultsTable({ result, onReset }: ResultsTableProps) {
  const [activeTab, setActiveTab] = useState<'success' | 'skipped'>('success');

  const successRate =
    result.totalProcessed > 0
      ? Math.round((result.success.length / result.totalProcessed) * 100)
      : 0;

  return (
    <div className="fade-in">
      {/* Stats */}
      <div className="stats-grid mb-6">
        <div className="stat-card">
          <div className="stat-value total">{result.totalProcessed}</div>
          <div className="stat-label">Total Rows</div>
        </div>
        <div className="stat-card">
          <div className="stat-value success">{result.success.length}</div>
          <div className="stat-label">Imported</div>
        </div>
        <div className="stat-card">
          <div className="stat-value danger">{result.skipped.length}</div>
          <div className="stat-label">Skipped</div>
        </div>
        <div className="stat-card">
          <div className="stat-value amber">{successRate}%</div>
          <div className="stat-label">Success Rate</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          id="tab-success"
          className={`tab-btn ${activeTab === 'success' ? 'active' : ''}`}
          onClick={() => setActiveTab('success')}
          aria-label="View successfully imported records"
        >
          ✅ Imported
          <span className={`tab-count success-count`}>{result.success.length}</span>
        </button>
        <button
          id="tab-skipped"
          className={`tab-btn ${activeTab === 'skipped' ? 'active' : ''}`}
          onClick={() => setActiveTab('skipped')}
          aria-label="View skipped records"
        >
          ⚠️ Skipped
          <span className={`tab-count danger-count`}>{result.skipped.length}</span>
        </button>
      </div>

      {/* Table */}
      {activeTab === 'success' ? (
        <SuccessTable records={result.success} />
      ) : (
        <SkippedTable records={result.skipped} />
      )}

      {/* Actions */}
      <div className="actions-row mt-6">
        <Button variant="secondary" onClick={onReset}>
          Import Another File
        </Button>
        <div className="actions-row-right">
          {result.success.length > 0 && (
            <Button 
              variant="primary" 
              onClick={() => downloadCSV(result.success, 'groweasy_crm_import.csv')}
            >
              ↓ Download CSV
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}