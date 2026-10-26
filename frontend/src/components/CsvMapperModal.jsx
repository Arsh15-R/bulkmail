import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  Check,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowRight,
  ChevronDown
} from 'lucide-react';

export const CsvMapperModal = ({ isOpen, onClose, onApplyData }) => {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [emailCol, setEmailCol] = useState('');
  const [nameCol, setNameCol] = useState('');
  const [attachmentCol, setAttachmentCol] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const processFile = (file) => {
    if (!file) return;

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setError('Please upload a valid .csv spreadsheet file.');
      return;
    }

    setFileName(file.name);
    setError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setError('The uploaded CSV file contains no data rows.');
          return;
        }

        const detectedHeaders = results.meta.fields || Object.keys(results.data[0]);
        setHeaders(detectedHeaders);
        setCsvData(results.data);

        // Smart auto-detection for email, name, attachment
        const lowerHeaders = detectedHeaders.map(h => ({ raw: h, lower: h.toLowerCase().trim() }));
        const emailMatch = lowerHeaders.find(h => h.lower.includes('email') || h.lower === 'to' || h.lower === 'recipient');
        if (emailMatch) setEmailCol(emailMatch.raw);

        const nameMatch = lowerHeaders.find(h => h.lower.includes('name') || h.lower === 'customer' || h.lower === 'first_name');
        if (nameMatch) setNameCol(nameMatch.raw);

        const attMatch = lowerHeaders.find(h => h.lower.includes('attach') || h.lower.includes('file') || h.lower.includes('invoice') || h.lower.includes('doc'));
        if (attMatch) setAttachmentCol(attMatch.raw);
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      }
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleConfirm = () => {
    if (!emailCol) {
      setError('Please choose which column contains the recipient Email address.');
      return;
    }

    const processed = csvData.map(row => {
      const email = String(row[emailCol] || '').trim();
      const name = nameCol ? String(row[nameCol] || '').trim() : '';
      const attachmentName = attachmentCol ? String(row[attachmentCol] || '').trim() : '';

      return {
        email,
        name,
        attachmentName,
        mergeData: { ...row }
      };
    }).filter(r => r.email.length > 0);

    onApplyData(processed, headers);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-11/60 dark:bg-black/75 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ type: "spring", stiffness: 480, damping: 36 }}
          className="relative bg-surface rounded-panel border border-border shadow-floating max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border-subtle bg-surface flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-control bg-accent-subtle text-accent flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground text-sm tracking-tight">
                  Import CSV & Map Placeholders
                </h3>
                <p className="text-xs text-text-muted">
                  Map spreadsheet columns for automated mail merge personalization.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-control text-text-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-control p-6 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-accent bg-accent-subtle/30 scale-[1.01]'
                  : fileName
                  ? 'border-accent/40 bg-surface-muted'
                  : 'border-border hover:border-accent/50 hover:bg-surface-muted/50'
              }`}
            >
              <input
                type="file"
                id="csv-file-input"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer block">
                <div className="w-10 h-10 rounded-pill bg-surface border border-border shadow-xs flex items-center justify-center mx-auto mb-2 text-accent">
                  <UploadCloud className="w-5 h-5" />
                </div>

                <div className="text-xs font-semibold text-foreground">
                  {fileName ? (
                    <span className="flex items-center justify-center space-x-2 text-accent">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>{fileName} ({csvData.length} records detected)</span>
                    </span>
                  ) : (
                    'Click to upload or drag & drop CSV file'
                  )}
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Standard comma-separated format (.csv) with header row
                </p>
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-control bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Column Mapping Section */}
            {headers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted font-mono">
                    Column Mapping
                  </h4>
                  <span className="text-[10px] text-text-muted font-mono">
                    {headers.length} columns detected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Email Column */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Email Column <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={emailCol}
                        onChange={(e) => setEmailCol(e.target.value)}
                        className="w-full text-xs rounded-control border border-border bg-surface text-foreground p-2 pr-8 appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono cursor-pointer"
                      >
                        <option value="">-- Select Column --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Name Column */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Name Column <span className="text-text-muted font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <select
                        value={nameCol}
                        onChange={(e) => setNameCol(e.target.value)}
                        className="w-full text-xs rounded-control border border-border bg-surface text-foreground p-2 pr-8 appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono cursor-pointer"
                      >
                        <option value="">-- None / In Merge Tags --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Attachment Column */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Attachment Filename <span className="text-text-muted font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <select
                        value={attachmentCol}
                        onChange={(e) => setAttachmentCol(e.target.value)}
                        className="w-full text-xs rounded-control border border-border bg-surface text-foreground p-2 pr-8 appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono cursor-pointer"
                      >
                        <option value="">-- None --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Available Merge Tags */}
                <div className="p-3 bg-surface-muted rounded-control border border-border-subtle text-xs space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-medium text-foreground text-[11px]">
                    <Sparkles className="w-3 h-3 text-accent" />
                    <span>Available Merge Tags:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {headers.map((h) => (
                      <span
                        key={h}
                        className="px-2 py-0.5 rounded-pill bg-surface border border-border text-accent font-mono text-[10px] font-semibold"
                      >
                        {`{{${h}}}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Data Preview Table */}
                <div className="space-y-1.5">
                  <h5 className="text-[11px] font-semibold text-text-muted">
                    Preview Data (First 3 of {csvData.length} records):
                  </h5>
                  <div className="overflow-x-auto border border-border rounded-control text-xs">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-surface-muted text-text-muted border-b border-border text-[11px] uppercase tracking-wider">
                        <tr>
                          {headers.slice(0, 5).map((h) => (
                            <th key={h} className="p-2.5 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle text-foreground text-[11px] bg-surface">
                        {csvData.slice(0, 3).map((row, idx) => (
                          <tr key={idx} className="hover:bg-surface-muted/40">
                            {headers.slice(0, 5).map((h) => (
                              <td key={h} className="p-2.5 truncate max-w-[140px]">
                                {row[h] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border-subtle bg-surface-raised flex items-center justify-end space-x-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-foreground rounded-control border border-border bg-surface hover:bg-surface-muted transition cursor-pointer"
            >
              Cancel
            </button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              disabled={!emailCol || csvData.length === 0}
              onClick={handleConfirm}
              className="px-4 py-2 text-xs font-semibold rounded-control bg-accent text-accent-foreground hover:opacity-95 shadow-resting disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply {csvData.length > 0 ? `(${csvData.length} Rows)` : ''}</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
