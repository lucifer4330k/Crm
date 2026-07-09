'use client';

import { useCallback, useState } from 'react';
import Papa from 'papaparse';
import FileUpload from '@/components/FileUpload';
import CSVPreview from '@/components/CSVPreview';
import ResultsTable from '@/components/ResultsTable';
import { Button } from '@/components/ui/Button';
import { AppStep, BatchProgress, ProcessingResult } from '@/lib/types';

const BATCH_SIZE = 10;

const STEPS: { key: AppStep; label: string; num: number }[] = [
  { key: 'upload',     label: 'Upload',   num: 1 },
  { key: 'preview',    label: 'Preview',  num: 2 },
  { key: 'processing', label: 'Process',  num: 3 },
  { key: 'results',    label: 'Results',  num: 4 },
];

function isStepCompleted(currentStep: AppStep, stepKey: AppStep): boolean {
  const order: AppStep[] = ['upload', 'preview', 'processing', 'results'];
  return order.indexOf(currentStep) > order.indexOf(stepKey);
}

function isStepActive(currentStep: AppStep, stepKey: AppStep): boolean {
  return currentStep === stepKey;
}

export default function HomePage() {
  const [step, setStep] = useState<AppStep>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [logEntries, setLogEntries] = useState<{ text: string; type: 'success' | 'error' | 'active' }[]>([]);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [apiError, setApiError] = useState<string>('');

  const addLog = (text: string, type: 'success' | 'error' | 'active' = 'active') => {
    setLogEntries(prev => [...prev.slice(-20), { text, type }]);
  };

  const handleFileAccepted = useCallback((file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (parsed) => {
        const headers = parsed.meta.fields || [];
        const rows = parsed.data as Record<string, string>[];
        setCsvHeaders(headers);
        setCsvRows(rows);
        setStep('preview');
      },
      error: (err) => {
        setApiError('Failed to parse CSV: ' + err.message);
      },
    });
  }, []);

  const handleProcess = useCallback(async () => {
    setStep('processing');
    setApiError('');
    setLogEntries([]);

    const totalBatches = Math.ceil(csvRows.length / BATCH_SIZE);
    let allSuccess: ProcessingResult['success'] = [];
    let allSkipped: ProcessingResult['skipped'] = [];

    for (let i = 0; i < totalBatches; i++) {
      const batch = csvRows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const batchNum = i + 1;
      const processedSoFar = i * BATCH_SIZE;

      setProgress({
        batchNumber: batchNum,
        totalBatches,
        processed: processedSoFar,
        total: csvRows.length,
      });

      addLog(`🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`, 'active');

      let attempts = 0;
      let success = false;

      while (attempts < 3 && !success) {
        try {
          const res = await fetch('/api/process-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: batch }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errData.error || `HTTP ${res.status}`);
          }

          const data = await res.json();
          allSuccess = [...allSuccess, ...(data.success || [])];
          allSkipped = [...allSkipped, ...(data.skipped || [])];

          addLog(
            `✅ Batch ${batchNum}: ${(data.success || []).length} imported, ${(data.skipped || []).length} skipped`,
            'success'
          );
          success = true;
        } catch (err: unknown) {
          attempts++;
          const msg = err instanceof Error ? err.message : String(err);
          if (attempts < 3) {
            addLog(`⚠️ Batch ${batchNum} attempt ${attempts} failed, retrying... (${msg})`, 'error');
            await new Promise(r => setTimeout(r, 1000 * attempts));
          } else {
            addLog(`❌ Batch ${batchNum} failed after 3 attempts: ${msg}`, 'error');
            allSkipped = [
              ...allSkipped,
              ...batch.map(row => ({ originalData: row, reason: 'Processing failed: ' + msg })),
            ];
          }
        }
      }
    }

    setProgress({ batchNumber: totalBatches, totalBatches, processed: csvRows.length, total: csvRows.length });
    addLog(`🎉 Done! ${allSuccess.length} imported, ${allSkipped.length} skipped.`, 'success');


    await new Promise(r => setTimeout(r, 800));

    setResult({ success: allSuccess, skipped: allSkipped, totalProcessed: csvRows.length });
    setStep('results');
  }, [csvRows]);

  const handleReset = () => {
    setStep('upload');
    setCsvHeaders([]);
    setCsvRows([]);
    setProgress(null);
    setLogEntries([]);
    setResult(null);
    setApiError('');
  };

  const progressPct = progress
    ? Math.round((progress.processed / Math.max(progress.total, 1)) * 100)
    : 0;

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="dot" />
          AI-Powered CRM Import
        </div>
        <h1 className="hero-title">
          Transform Any CSV into<br />
          <span>GrowEasy CRM Data</span>
        </h1>
        <p className="hero-subtitle">
          Upload your lead spreadsheet and let AI intelligently extract,
          map, and structure your data — ready for CRM import in seconds.
        </p>

        {/* Step Indicator */}
        <div className="step-indicator" role="navigation" aria-label="Progress steps">
          {STEPS.map((s, idx) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`step-item ${isStepActive(step, s.key) ? 'active' : ''} ${isStepCompleted(step, s.key) ? 'completed' : ''}`}
              >
                <div className="step-num">
                  {isStepCompleted(step, s.key) ? '✓' : s.num}
                </div>
                <span className="step-label">{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && <div className="step-divider" />}
            </div>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <div className="container" style={{ paddingBottom: '64px' }}>

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <div className="card fade-in">
            <div className="card-header">
              <h2 className="card-title">📁 Upload Your CSV</h2>
              <p className="card-subtitle">
                Supports any CSV format — column headers will be auto-detected and mapped by AI
              </p>
            </div>
            <FileUpload onFileAccepted={handleFileAccepted} />

            {apiError && (
              <div className="alert alert-error mt-4">
                <span>⚠️</span>
                <span>{apiError}</span>
              </div>
            )}

            <div className="alert alert-info mt-6">
              <span>💡</span>
              <div>
                <strong>How it works:</strong> Upload any CSV with lead data. Our AI will intelligently
                map columns like name, email, phone, city, status, etc. into the GrowEasy CRM format —
                no manual column mapping needed.
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === 'preview' && (
          <div className="card fade-in">
            <CSVPreview
              headers={csvHeaders}
              rows={csvRows}
              totalRows={csvRows.length}
            />

            {apiError && (
              <div className="alert alert-error mt-4">
                <span>⚠️</span>
                <span>{apiError}</span>
              </div>
            )}

            <div className="alert alert-info mt-4">
              <span>🤖</span>
              <span>
                Our AI will process <strong>{csvRows.length} records</strong> in{' '}
                <strong>{Math.ceil(csvRows.length / BATCH_SIZE)} batches</strong>.
                Records missing both email and mobile will be automatically skipped.
              </span>
            </div>

            <div className="actions-row">
              <Button id="back-to-upload-btn" variant="secondary" onClick={handleReset}>
                ← Back
              </Button>
              <Button
                id="process-btn"
                variant="primary"
                size="lg"
                onClick={handleProcess}
                disabled={csvRows.length === 0}
              >
                🚀 Process with AI ({csvRows.length} rows)
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Processing ── */}
        {step === 'processing' && (
          <div className="card fade-in">
            <div className="processing-center">
              <div className="spinner-ring" aria-label="Processing" />

              <div>
                <p className="processing-title">AI is Processing Your Data</p>
                <p className="processing-subtitle">
                  AI is analyzing each record and mapping fields to the GrowEasy CRM schema.
                  Please don&apos;t close this window.
                </p>
              </div>

              {progress && (
                <div style={{ width: '100%', maxWidth: '480px' }}>
                  <div className="progress-wrapper">
                    <div className="progress-header">
                      <span className="progress-label">
                        Batch {progress.batchNumber} of {progress.totalBatches}
                      </span>
                      <span className="progress-pct">{progressPct}%</span>
                    </div>
                    <div className="progress-bar" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>
                      {progress.processed} / {progress.total} records
                    </p>
                  </div>
                </div>
              )}

              <div className="batch-log">
                {logEntries.length === 0 ? (
                  <p className="log-entry active">⏳ Initializing...</p>
                ) : (
                  logEntries.map((entry, i) => (
                    <p key={i} className={`log-entry ${entry.type}`}>
                      {entry.text}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Results ── */}
        {step === 'results' && result && (
          <div className="card fade-in">
            <div className="card-header">
              <h2 className="card-title">🎉 Import Complete!</h2>
              <p className="card-subtitle">
                Your data has been successfully extracted and mapped to the GrowEasy CRM schema
              </p>
            </div>
            <ResultsTable result={result} onReset={handleReset} />
          </div>
        )}
      </div>
    </>
  );
}
