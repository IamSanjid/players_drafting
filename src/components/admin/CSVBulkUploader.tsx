'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { playersApi } from '@/lib/api';
import { getSocket } from '@/lib/socketClient';

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
        className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50 shadow-inner'
            : 'border-gray-300 hover:bg-gray-50'
        }`}
      >
        <label className="cursor-pointer block">
          <svg
            className={`mx-auto h-12 w-12 transition ${isDragging ? 'text-indigo-500 scale-110' : 'text-gray-400'}`}
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
            className={`mt-2 block text-sm font-semibold transition ${isDragging ? 'text-indigo-700' : 'text-gray-900'}`}
          >
            {isDragging ? 'Drop your CSV here' : 'Upload CSV File'}
          </span>
          <span className="mt-1 block text-xs text-slate-400">
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
          <label className="flex items-center gap-2 cursor-pointer group">
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
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
              CSV contains headers?
            </span>
          </label>
        </div>

        {error ? (
          <div className="mt-4 text-xs font-bold text-red-500">{error}</div>
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50 px-4 py-3">
        <div>
          <h3 className="font-bold text-indigo-900">Map CSV Columns</h3>
          <p className="text-xs text-indigo-700">
            Step 2 of 2: match your CSV fields. Parsed rows: {csvData.length}
          </p>
        </div>
        <button
          onClick={() => setCsvData([])}
          className="text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          Reset File
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 p-3 text-sm font-medium border-b border-red-100">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-3">
        <label className="text-sm font-bold text-gray-700">
          Global Category (if not in CSV):
        </label>
        <select
          value={globalCategory}
          onChange={(e) => setGlobalCategory(e.target.value)}
          className="border-gray-300 rounded text-sm focus:ring-indigo-500 text-gray-900 bg-white shadow-sm font-medium"
        >
          <option value="">-- None (Must map from CSV) --</option>
          <option value="Oversea">Oversea</option>
          <option value="Local">Local</option>
        </select>
      </div>

      <div className="grid max-h-96 grid-cols-1 gap-4 overflow-y-auto bg-slate-50 p-4 md:grid-cols-2">
        {dbFields.map((field) => (
          <div
            key={field.key}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          >
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex justify-between">
              {field.label}{' '}
              {field.req && <span className="text-red-500">*</span>}
            </label>
            <select
              value={mapping[field.key]}
              onChange={(e) =>
                setMapping({ ...mapping, [field.key]: e.target.value })
              }
              className="w-full border-gray-300 rounded text-sm focus:ring-indigo-500 text-gray-900 bg-white shadow-sm font-medium"
            >
              <option value="" className="text-gray-500">
                -- Ignore --
              </option>
              {headers.map((h) => (
                <option key={h} value={h} className="text-gray-900">
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-3">
        <button
          onClick={handleImport}
          disabled={uploading}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {uploading ? 'Importing...' : `Import ${csvData.length} Players`}
        </button>
      </div>
    </div>
  );
}
