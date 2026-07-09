'use client';

import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface FileUploadProps {
  onFileAccepted: (file: File) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function FileUpload({ onFileAccepted }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndAccept = useCallback(
    (file: File) => {
      setError('');
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        setError('Please upload a valid .csv file.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be under 10 MB.');
        return;
      }
      setSelectedFile(file);
      onFileAccepted(file);
    },
    [onFileAccepted]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndAccept(file);
    },
    [validateAndAccept]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndAccept(file);
  };

  const onClear = () => {
    setSelectedFile(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <div
        id="upload-zone"
        className={`upload-zone upload-zone-glow ${isDragging ? 'drag-active' : ''}`}
        onClick={() => !selectedFile && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onInputChange}
          style={{ display: 'none' }}
          id="csv-file-input"
          aria-label="CSV file input"
        />

        <div className="upload-icon-wrap">
          {isDragging ? '📥' : '📊'}
        </div>

        {isDragging ? (
          <>
            <p className="upload-title">Drop it here!</p>
            <p className="upload-subtitle">Release to upload your CSV file</p>
          </>
        ) : (
          <>
            <p className="upload-title">Drag & drop your CSV file</p>
            <p className="upload-subtitle">or click to browse your files</p>
            <span className="upload-hint">
              <span>📁</span>
              <span>.csv files only · Max 10 MB</span>
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="alert alert-error mt-4">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {selectedFile && !error && (
        <div className="file-selected mt-4">
          <span className="file-icon">✅</span>
          <div className="file-info">
            <p className="file-name">{selectedFile.name}</p>
            <p className="file-size">{formatBytes(selectedFile.size)}</p>
          </div>
          <Button variant="secondary" onClick={onClear}>
            ✕ Remove
          </Button>
        </div>
      )}
    </div>
  );
}