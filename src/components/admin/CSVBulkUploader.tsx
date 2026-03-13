'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { playersApi } from '@/lib/api';
import { cn } from '@/lib/ui';
import { getSocket } from '@/lib/socketClient';
import styles from './CSVBulkUploader.module.css';

type CsvRow = Record<string, string>;
type MappingKey =
  | 'name'
  | 'category'
  | 'subCategory'
  | 'position'
  | 'priceBDT'
  | 'priceUSD'
  | 'country'
  | 'availability'
  | 'imageUrl';
type MappingState = Record<MappingKey, string>;

function getProperAvailability(value: string): string {
  const valueLower = value.toLowerCase();
  if (valueLower.includes('full') && valueLower.includes('time')) {
    return 'Full-Time';
  }
  if (valueLower.includes('partial')) {
    return 'Partial';
  }
  return 'Custom';
}

export default function CSVBulkUploader({
  onImportComplete,
}: {
  onImportComplete: () => void;
}) {
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalCategory, setGlobalCategory] = useState<string>('');
  const [hasHeaders, setHasHeaders] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Mapping state: key is DB field, value is CSV header name
  const [mapping, setMapping] = useState<MappingState>({
    name: '',
    category: '',
    subCategory: '',
    position: '',
    priceBDT: '',
    priceUSD: '',
    country: '',
    availability: '',
    imageUrl: '',
  });

  const socket = getSocket();

  const normalizeRow = (row: Record<string, unknown>): CsvRow => {
    const normalized: CsvRow = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[key] = value == null ? '' : String(value);
    });
    return normalized;
  };

  const processFile = (file: File, withHeaders = hasHeaders) => {
    Papa.parse(file, {
      header: withHeaders,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV: ' + results.errors[0].message);
          return;
        }

        let parsedHeaders: string[] = [];
        let parsedData: CsvRow[] = [];

        if (withHeaders) {
          parsedHeaders = results.meta.fields || [];
          parsedData = (results.data as Record<string, unknown>[]).map(
            normalizeRow
          );
        } else {
          const rawData = results.data as unknown[][];
          if (rawData.length > 0) {
            parsedHeaders = rawData[0].map((val, i) => `Col ${i + 1} (${val})`);
            parsedData = rawData.map((row) => {
              const obj: CsvRow = {};
              row.forEach((cell, i) => {
                obj[parsedHeaders[i]] = cell == null ? '' : String(cell);
              });
              return obj;
            });
          }
        }

        setHeaders(parsedHeaders);
        setCsvData(parsedData);
        setError(null);

        // Auto-map if headers match exactly (case insensitive)
        const newMapping = { ...mapping };
        const lowerHeaders = parsedHeaders.map((h) => h.toLowerCase());

        (Object.keys(newMapping) as MappingKey[]).forEach((dbField) => {
          const matchIndex = lowerHeaders.findIndex(
            (h) =>
              h === dbField.toLowerCase() || h.includes(dbField.toLowerCase())
          );
          if (matchIndex !== -1) {
            newMapping[dbField] = parsedHeaders[matchIndex];
          }
        });
        setMapping(newMapping);
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        processFile(file);
      } else {
        setError('Please upload a valid CSV file.');
      }
    }
  };

  const handleImport = async () => {
    if (
      !mapping.name ||
      (!mapping.category && !globalCategory) ||
      !mapping.subCategory ||
      !mapping.position
    ) {
      setError(
        'Name, SubCategory, Position, and either a mapped Category or Global Category are required.'
      );
      return;
    }

    setUploading(true);
    setError(null);

    // Transform CSV data to DB shape using the mapping
    const payload = csvData.map((row) => {
      const rowCategory =
        mapping.category && row[mapping.category]
          ? row[mapping.category]
          : globalCategory;
      return {
        name: row[mapping.name],
        category: rowCategory,
        subCategory: row[mapping.subCategory],
        position: row[mapping.position],
        priceBDT: mapping.priceBDT ? row[mapping.priceBDT] : null,
        priceUSD: mapping.priceUSD ? row[mapping.priceUSD] : null,
        country: mapping.country ? row[mapping.country] : null,
        availability: mapping.availability
          ? getProperAvailability(row[mapping.availability] || '')
          : null,
        imageUrl: mapping.imageUrl ? row[mapping.imageUrl] : null,
      };
    });

    try {
      const res = await playersApi.bulkImport(payload);
      if (!res.ok) throw new Error(res.error);

      socket.emit('state_changed'); // Notify connected clients
      onImportComplete(); // Close modal/refresh parent
      setCsvData([]); // Reset
      setHeaders([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  if (csvData.length === 0) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'p-8 text-center transition',
          styles.dropzone,
          isDragging && styles.dropzoneActive
        )}
      >
        <label className="cursor-pointer block">
          <svg
            className={cn(
              'mx-auto h-12 w-12 transition',
              styles.uploadIcon,
              isDragging && styles.uploadIconActive,
              isDragging && 'scale-110'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span
            className={cn(
              'mt-2 block text-sm font-semibold transition',
              styles.uploadHeading,
              isDragging && styles.uploadHeadingActive
            )}
          >
            {isDragging ? 'Drop your CSV here' : 'Upload CSV File'}
          </span>
          <span className={cn('mt-1 block text-xs', styles.uploadHint)}>
            Drag and drop or click to browse.
          </span>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        <div className="mt-6 flex items-center justify-center gap-3">
          <label className={cn('group flex cursor-pointer items-center gap-2', styles.checkboxRow)}>
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={hasHeaders}
                onChange={(e) => {
                  const val = e.target.checked;
                  setHasHeaders(val);
                  if (selectedFile) {
                    processFile(selectedFile, val);
                  }
                }}
                className="h-4 w-4 rounded"
              />
            </div>
            <span
              className={cn(
                'text-sm font-medium transition-colors',
                styles.checkboxText
              )}
            >
              CSV contains headers?
            </span>
          </label>
        </div>

        {error ? (
          <div className={cn('mt-4 text-xs font-bold', styles.errorCallout)}>
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  const dbFields: Array<{ key: MappingKey; label: string; req: boolean }> = [
    { key: 'name', label: 'Player Name', req: true },
    {
      key: 'category',
      label: 'Category (Oversea/Local)',
      req: !globalCategory,
    },
    { key: 'subCategory', label: 'Sub-Category (A-Z)', req: true },
    { key: 'position', label: 'Position', req: true },
    { key: 'priceBDT', label: 'Price (BDT)', req: false },
    { key: 'priceUSD', label: 'Price (USD)', req: false },
    { key: 'country', label: 'Country', req: false },
    { key: 'availability', label: 'Availability', req: false },
    { key: 'imageUrl', label: 'Image URL', req: false },
  ];

  return (
    <div className={styles.mappingShell}>
      <div className={cn('flex items-center justify-between px-4 py-3', styles.mappingHeader)}>
        <div>
          <h3 className={cn('font-bold', styles.mappingTitle)}>Map CSV Columns</h3>
          <p className={cn('text-xs', styles.mappingSubtitle)}>
            Step 2 of 2: match your CSV fields. Parsed rows: {csvData.length}
          </p>
        </div>
        <button
          onClick={() => setCsvData([])}
          className={cn('text-sm font-medium', styles.resetButton)}
        >
          Reset File
        </button>
      </div>

      {error ? (
        <div className={cn('mx-4 mt-3 p-3 text-sm font-medium', styles.errorCallout)}>
          {error}
        </div>
      ) : null}

      <div className={cn('flex items-center gap-4 px-4 py-3', styles.globalRow)}>
        <label className={cn('text-sm font-bold', styles.globalLabel)}>
          Global Category (if not in CSV):
        </label>
        <select
          value={globalCategory}
          onChange={(e) => setGlobalCategory(e.target.value)}
          className={cn('theme-field font-medium', styles.selectField)}
        >
          <option value="">-- None (Must map from CSV) --</option>
          <option value="Oversea">Oversea</option>
          <option value="Local">Local</option>
        </select>
      </div>

      <div
        className={cn(
          'grid max-h-96 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2',
          styles.mappingGrid
        )}
      >
        {dbFields.map((field) => (
          <div
            key={field.key}
            className={cn('flex flex-col p-3', styles.fieldCard)}
          >
            <label
              className={cn(
                'mb-1 flex justify-between text-xs font-bold uppercase tracking-wider',
                styles.fieldLabel
              )}
            >
              {field.label}{' '}
              {field.req && <span className={styles.required}>*</span>}
            </label>
            <select
              value={mapping[field.key]}
              onChange={(e) =>
                setMapping({ ...mapping, [field.key]: e.target.value })
              }
              className={cn('theme-field w-full font-medium', styles.selectField)}
            >
              <option value="">
                -- Ignore --
              </option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className={cn('flex justify-end px-4 py-3', styles.footer)}>
        <button
          onClick={handleImport}
          disabled={uploading}
          className={cn(
            'theme-button theme-button-primary font-bold transition disabled:opacity-50',
            styles.importButton
          )}
        >
          {uploading ? 'Importing...' : `Import ${csvData.length} Players`}
        </button>
      </div>
    </div>
  );
}
