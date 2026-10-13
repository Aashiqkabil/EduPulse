import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Eye,
  FileCheck,
  Database,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Student, CsvValidationSummary } from '../../types/student';
import { 
  validateCsvContent, 
  exportValidationErrorsToCsv, 
  generateSampleCsvTemplate,
  CSV_SCHEMA_COLUMNS 
} from '../../utils/csvValidator';
import { SCORING_DISCLAIMER } from '../../utils/scoringEngine';

interface ImportExecutionResult {
  fileName: string;
  totalRows: number;
  validRows: number;
  rejectedRows: number;
  savedRows: number;
  persistedToSupabase: boolean;
  timestamp: string;
}

interface DataImportTabProps {
  onApplyImport: (
    importedStudents: Student[],
    fileName: string,
    saveToSupabase: boolean
  ) => Promise<{ success: boolean; count?: number; error?: string | null }> | { success: boolean; count?: number; error?: string | null };
  datasetSource: string;
  totalActiveStudents: number;
  onRestoreSyntheticDemo: () => void;
  supabaseConfigured?: boolean;
  supabaseConnected?: boolean;
  supabaseMessage?: string;
  onRefreshFromSupabase?: () => void;
  isDemoMode?: boolean;
  isVerifiedAdmin?: boolean;
}

export const DataImportTab: React.FC<DataImportTabProps> = ({
  onApplyImport,
  datasetSource,
  totalActiveStudents,
  onRestoreSyntheticDemo,
  supabaseConfigured = false,
  supabaseConnected = false,
  supabaseMessage = '',
  onRefreshFromSupabase,
  isDemoMode = false,
  isVerifiedAdmin = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationSummary, setValidationSummary] = useState<CsvValidationSummary | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorDownloadSuccess, setErrorDownloadSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [importAppliedNotice, setImportAppliedNotice] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ImportExecutionResult | null>(null);
  const [saveToSupabase, setSaveToSupabase] = useState(Boolean(supabaseConnected && !isDemoMode && isVerifiedAdmin));
  const [isApplying, setIsApplying] = useState(false);
  const [applyErrorMessage, setApplyErrorMessage] = useState<string | null>(null);

  // Automatically enable saveToSupabase by default ONLY for verified admins in live mode
  React.useEffect(() => {
    if (supabaseConnected && !isDemoMode && isVerifiedAdmin) {
      setSaveToSupabase(true);
    } else {
      setSaveToSupabase(false);
    }
  }, [supabaseConnected, isDemoMode, isVerifiedAdmin]);

  // Trigger file download helper
  const triggerDownload = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const csvData = generateSampleCsvTemplate();
    triggerDownload(csvData, 'EduPulse_Student_Import_Template.csv');
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // Download Validation Errors CSV
  const handleDownloadErrors = () => {
    if (!validationSummary || validationSummary.errors.length === 0) return;
    const errorCsv = exportValidationErrorsToCsv(validationSummary.errors);
    triggerDownload(errorCsv, `Validation_Errors_${validationSummary.fileName.replace(/\.csv$/i, '')}.csv`);
    setErrorDownloadSuccess(true);
    setTimeout(() => setErrorDownloadSuccess(false), 3000);
  };

  // Process uploaded file
  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a valid CSV file (.csv extension).');
      return;
    }

    setIsValidating(true);
    setImportAppliedNotice(null);

    try {
      const text = await file.text();
      const summary = await validateCsvContent(text, file.name);
      setValidationSummary(summary);
    } catch (err) {
      console.error('File reading failed:', err);
      alert('Failed to read file. Please ensure the file is accessible.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmApply = async () => {
    if (!validationSummary || validationSummary.validStudents.length === 0) return;

    setIsApplying(true);
    setApplyErrorMessage(null);

    const targetSaveToDb = Boolean(saveToSupabase && supabaseConnected);
    const result = await onApplyImport(
      validationSummary.validStudents,
      validationSummary.fileName,
      targetSaveToDb
    );

    setIsApplying(false);

    if (result && !result.success) {
      setApplyErrorMessage(result.error || 'Failed to apply import.');
      return;
    }

    const destinationLabel = targetSaveToDb 
      ? 'into EduPulse-AI Supabase Database (public.students)' 
      : 'into active local cohort (Session Only)';

    const savedCount = targetSaveToDb ? (result?.count ?? 0) : 0;

    setExecutionResult({
      fileName: validationSummary.fileName,
      totalRows: validationSummary.totalRows,
      validRows: validationSummary.validRowsCount,
      rejectedRows: validationSummary.invalidRowsCount,
      savedRows: savedCount,
      persistedToSupabase: targetSaveToDb && savedCount > 0,
      timestamp: new Date().toLocaleTimeString(),
    });

    if (targetSaveToDb && savedCount > 0) {
      setImportAppliedNotice(`Successfully saved and verified ${savedCount} student records ${destinationLabel} from "${validationSummary.fileName}".`);
    } else {
      setImportAppliedNotice(`Loaded ${validationSummary.validStudents.length} verified student records into active local session (0 saved to database) from "${validationSummary.fileName}".`);
    }
    setShowConfirmModal(false);
  };

  const handleResetStaging = () => {
    setValidationSummary(null);
    setImportAppliedNotice(null);
    setExecutionResult(null);
    setApplyErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Dataset & Supabase Context Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Active Cohort Banner */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Platform Dataset</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  datasetSource === 'Synthetic Demo' 
                    ? 'bg-amber-100 text-amber-800' 
                    : datasetSource === 'Supabase DB'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {datasetSource}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Current cohort: <strong>{totalActiveStudents} students</strong> active in all dashboards.
              </p>
            </div>
          </div>

          {datasetSource !== 'Synthetic Demo' && (
            <button
              onClick={onRestoreSyntheticDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200 transition-colors flex-shrink-0"
              title="Restore local demo dataset without deleting database records"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Demo Mode</span>
            </button>
          )}
        </div>

        {/* Supabase Database Connection Status Banner */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              supabaseConnected 
                ? 'bg-emerald-50 text-emerald-700' 
                : supabaseConfigured 
                ? 'bg-amber-50 text-amber-700'
                : 'bg-slate-100 text-slate-600'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">EduPulse-AI Database</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  supabaseConnected 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : supabaseConfigured
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {supabaseConnected ? 'Connected' : supabaseConfigured ? 'Connection Error' : 'Unconfigured'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 truncate max-w-xs" title={supabaseMessage}>
                {supabaseConnected 
                  ? 'Table public.students active & secured with RLS'
                  : supabaseMessage || 'Running in local Demo mode.'}
              </p>
            </div>
          </div>

          {supabaseConnected && onRefreshFromSupabase && (
            <button
              onClick={onRefreshFromSupabase}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors flex-shrink-0"
              title="Reload saved cohort from Supabase database"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload DB</span>
            </button>
          )}
        </div>
      </div>

      {/* Supabase / Write Error Banner */}
      {applyErrorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-start justify-between gap-3 text-rose-950 text-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-rose-900">Database Operation Rejected</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-900">
                  Supabase Error
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-rose-800 bg-white/80 p-2.5 rounded-xl border border-rose-200 break-all select-all">
                {applyErrorMessage}
              </p>
              <p className="mt-1.5 text-xs text-rose-700 font-medium">
                EduPulse AI did NOT silently fall back to demo data. No records were written to the database.
              </p>
            </div>
          </div>
          <button
            onClick={() => setApplyErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800 font-bold text-xs px-2 py-1 rounded-lg hover:bg-rose-100 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Verified Import Execution Results Card */}
      {executionResult && (
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Verified Import Execution Summary</span>
                  <span className="text-[10px] font-mono text-slate-400 font-normal">[{executionResult.timestamp}]</span>
                </h3>
                <p className="text-xs text-slate-500">
                  File: <code className="font-mono font-semibold text-slate-700">{executionResult.fileName}</code>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                executionResult.persistedToSupabase 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {executionResult.persistedToSupabase ? '✓ Persisted in Supabase (public.students)' : '⚠ Session Only (0 Saved to Database)'}
              </span>
              <button
                onClick={() => setExecutionResult(null)}
                className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5"
              >
                ×
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1. Total CSV Rows</span>
              <span className="text-xl font-extrabold text-slate-800 mt-1 block">{executionResult.totalRows}</span>
              <span className="text-[11px] text-slate-500">Supplied in file</span>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">2. Valid Rows</span>
              <span className="text-xl font-extrabold text-emerald-800 mt-1 block">{executionResult.validRows}</span>
              <span className="text-[11px] text-emerald-700">Passed all schema rules</span>
            </div>

            <div className={`p-3 rounded-xl border ${
              executionResult.rejectedRows > 0 
                ? 'bg-rose-50/70 border-rose-200/80' 
                : 'bg-slate-50 border-slate-200/80'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                executionResult.rejectedRows > 0 ? 'text-rose-600' : 'text-slate-400'
              }`}>3. Rejected Rows</span>
              <span className={`text-xl font-extrabold mt-1 block ${
                executionResult.rejectedRows > 0 ? 'text-rose-800' : 'text-slate-800'
              }`}>{executionResult.rejectedRows}</span>
              <span className={`text-[11px] ${
                executionResult.rejectedRows > 0 ? 'text-rose-700' : 'text-slate-500'
              }`}>{executionResult.rejectedRows > 0 ? 'Excluded from platform' : 'Zero validation errors'}</span>
            </div>

            <div className={`p-3 rounded-xl border ${
              executionResult.persistedToSupabase 
                ? 'bg-emerald-50/70 border-emerald-200/80' 
                : 'bg-amber-50/70 border-amber-200/80'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                executionResult.persistedToSupabase ? 'text-emerald-700' : 'text-amber-800'
              }`}>4. Saved to Supabase</span>
              <span className={`text-xl font-extrabold mt-1 block ${
                executionResult.persistedToSupabase ? 'text-emerald-900' : 'text-amber-900'
              }`}>
                {executionResult.persistedToSupabase ? `${executionResult.savedRows} Confirmed` : '0 (Local Only)'}
              </span>
              <span className={`text-[11px] font-medium ${
                executionResult.persistedToSupabase ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {executionResult.persistedToSupabase 
                  ? 'Confirmed in public.students' 
                  : `${executionResult.validRows} rows in session memory only`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Applied Notice */}
      {importAppliedNotice && !executionResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{importAppliedNotice}</span>
          </div>
          <button
            onClick={() => setImportAppliedNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Upload Staging Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">CSV Ingestion & Validation Pipeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict schema verification: zero unvalidated or corrupted records will overwrite the active cohort.
            </p>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
            title="Download CSV template matching required schema"
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Downloaded Template!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Sample CSV Template</span>
              </>
            )}
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-indigo-600 bg-indigo-50/70 scale-[0.99]'
              : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-indigo-400'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".csv"
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-3 shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-sm font-bold text-slate-800">
            {isValidating ? 'Parsing and validating CSV data...' : 'Upload Student Dataset (.csv)'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Drag and drop your CSV file here, or click to browse. Valid records will be scored via the deterministic engine.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-slate-500">
            <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200">PapaParse Engine</span>
            <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200">14 Columns Schema</span>
            <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200">Row-level Validation</span>
          </div>
        </div>

        {/* Validation Results & Preview Section */}
        {validationSummary && (
          <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
            
            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Rows</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{validationSummary.totalRows}</p>
                <span className="text-[10px] text-slate-400 truncate block">File: {validationSummary.fileName}</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase">Valid Rows</span>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{validationSummary.validRowsCount}</p>
                <span className="text-[10px] text-emerald-600">Ready to ingest</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
                <span className="text-[11px] font-semibold text-rose-800 uppercase">Invalid Rows</span>
                <p className="text-2xl font-bold text-rose-700 mt-1">{validationSummary.invalidRowsCount}</p>
                <span className="text-[10px] text-rose-600">Will be rejected</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                <span className="text-[11px] font-semibold text-amber-800 uppercase">Duplicate IDs</span>
                <p className="text-2xl font-bold text-amber-700 mt-1">{validationSummary.duplicateIdsCount}</p>
                <span className="text-[10px] text-amber-600">ID conflicts found</span>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200">
                <span className="text-[11px] font-semibold text-indigo-800 uppercase">Missing Values</span>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{validationSummary.missingValuesCount}</p>
                <span className="text-[10px] text-indigo-600">Empty cells checked</span>
              </div>
            </div>

            {/* Ingestion Action Bar */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Verification Decision
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {validationSummary.validRowsCount > 0 ? (
                    <span>
                      <strong>{validationSummary.validRowsCount}</strong> valid student records can be ingested. 
                      {validationSummary.invalidRowsCount > 0 && (
                        <span className="text-rose-600 font-medium"> ({validationSummary.invalidRowsCount} invalid records will be excluded).</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-rose-600 font-semibold">
                      Zero valid rows found. Please fix the reported errors before applying import.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetStaging}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
                >
                  Clear Staging
                </button>

                {validationSummary.errors.length > 0 && (
                  <button
                    onClick={handleDownloadErrors}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{errorDownloadSuccess ? 'Downloaded CSV' : 'Export Errors (.csv)'}</span>
                  </button>
                )}

                {validationSummary.validRowsCount > 0 && (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    <span>Apply Import ({validationSummary.validRowsCount} Rows)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Validation Errors Table (if errors exist) */}
            {validationSummary.errors.length > 0 && (
              <div className="border border-rose-200 rounded-2xl overflow-hidden bg-rose-50/20">
                <div className="p-3.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold text-rose-950">
                      Row-Level Validation Messages ({validationSummary.errors.length} issues detected)
                    </span>
                  </div>
                  <span className="text-[11px] text-rose-700 font-medium">
                    Line numbers match CSV file (Line 1 = Headers)
                  </span>
                </div>

                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">CSV Line</th>
                        <th className="px-4 py-2.5">Student ID</th>
                        <th className="px-4 py-2.5">Affected Column</th>
                        <th className="px-4 py-2.5">Invalid Value</th>
                        <th className="px-4 py-2.5">Validation Rule & Issue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 text-slate-700 bg-white">
                      {validationSummary.errors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/50">
                          <td className="px-4 py-2 font-mono font-bold text-rose-600">
                            Line {err.rowNumber}
                          </td>
                          <td className="px-4 py-2 font-mono text-slate-600">
                            {err.studentId || 'N/A'}
                          </td>
                          <td className="px-4 py-2 font-semibold text-slate-900">
                            {err.column}
                          </td>
                          <td className="px-4 py-2 font-mono text-slate-500 truncate max-w-xs">
                            {err.value !== undefined ? `"${err.value}"` : '—'}
                          </td>
                          <td className="px-4 py-2 text-rose-700">
                            {err.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Valid Rows Preview Table */}
            {validationSummary.validRowsCount > 0 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Verified Rows Preview (Showing first {Math.min(5, validationSummary.validStudents.length)} of {validationSummary.validRowsCount})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Calculated via prototype scoring engine
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/60 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Student ID</th>
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-4 py-2.5">Department</th>
                        <th className="px-4 py-2.5 text-center">CGPA</th>
                        <th className="px-4 py-2.5 text-center">Attendance</th>
                        <th className="px-4 py-2.5 text-center">Success Score</th>
                        <th className="px-4 py-2.5 text-center">Academic Risk</th>
                        <th className="px-4 py-2.5 text-center">Placement Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {validationSummary.validStudents.slice(0, 5).map((s) => (
                        <tr key={s.studentId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-mono font-bold text-indigo-600">{s.studentId}</td>
                          <td className="px-4 py-2 font-semibold text-slate-900">{s.name}</td>
                          <td className="px-4 py-2 text-slate-600">{s.department}</td>
                          <td className="px-4 py-2 text-center">{s.cgpa.toFixed(2)}</td>
                          <td className="px-4 py-2 text-center">{s.attendanceRate}%</td>
                          <td className="px-4 py-2 text-center font-bold text-indigo-700">{s.successScore ?? 'N/A'}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.academicRisk === 'High' ? 'bg-rose-100 text-rose-800' :
                              s.academicRisk === 'Medium' ? 'bg-amber-100 text-amber-800' :
                              s.academicRisk === 'Low' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {s.academicRisk}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.placementRisk === 'High' ? 'bg-rose-100 text-rose-800' :
                              s.placementRisk === 'Medium' ? 'bg-amber-100 text-amber-800' :
                              s.placementRisk === 'Low' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {s.placementRisk}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unified Schema Reference Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Unified CSV Schema Specification</h2>
              <p className="text-xs text-slate-500">
                14 standard student attributes validated prior to calculation
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-mono">
            {CSV_SCHEMA_COLUMNS.length} Columns
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Column Key</th>
                <th className="px-5 py-3">Data Type</th>
                <th className="px-5 py-3 text-center">Required</th>
                <th className="px-5 py-3">Allowed Range / Format</th>
                <th className="px-5 py-3">Attribute Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {CSV_SCHEMA_COLUMNS.map((col) => (
                <tr key={col.header} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-mono font-bold text-indigo-600">{col.header}</td>
                  <td className="px-5 py-3 font-mono text-slate-500">{col.type}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      col.required ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {col.required ? 'Required' : 'Optional'}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-600">
                    {col.min !== undefined && col.max !== undefined ? `${col.min} to ${col.max}` : col.type === 'boolean' ? 'TRUE / FALSE' : 'Non-empty text'}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{col.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>{SCORING_DISCLAIMER}</span>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && validationSummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Confirm Dataset Replacement
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                You are about to load <strong>{validationSummary.validStudents.length} validated student records</strong> from <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{validationSummary.fileName}</code> into EduPulse AI.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="flex justify-between">
                <span>Valid records to apply:</span>
                <strong className="text-emerald-700">{validationSummary.validStudents.length}</strong>
              </p>
              {validationSummary.invalidRowsCount > 0 && (
                <p className="flex justify-between">
                  <span>Invalid records rejected:</span>
                  <strong className="text-rose-700">{validationSummary.invalidRowsCount}</strong>
                </p>
              )}
              <p className="flex justify-between">
                <span>Current active records replaced:</span>
                <strong className="text-slate-800">{totalActiveStudents}</strong>
              </p>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              All overview KPIs, charts, priority tables, and student directories will immediately reflect this new cohort. You can restore the demo dataset anytime.
            </p>

            {/* Supabase Persistence Option */}
            {isDemoMode ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Offline Demo Mode (Database Writes Disabled)</span>
                  <span className="text-[11px] text-amber-800">
                    You are in Reviewer Demo Mode. This student cohort will only be loaded into temporary local session memory (0 saved to Supabase). To persist records to public.students, sign in with verified institutional administrator credentials.
                  </span>
                </div>
              </div>
            ) : !isVerifiedAdmin ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Administrator Authorization Required</span>
                  <span className="text-[11px] text-rose-800">
                    Only verified institutional administrators can persist cohorts to the remote Supabase database.
                  </span>
                </div>
              </div>
            ) : supabaseConnected ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 cursor-pointer transition-colors hover:bg-indigo-50">
                  <input
                    type="checkbox"
                    checked={saveToSupabase}
                    onChange={(e) => setSaveToSupabase(e.target.checked)}
                    disabled={isApplying}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-indigo-950 block">Save to EduPulse-AI Supabase Database</span>
                    <span className="text-indigo-700 text-[11px]">Persists records via upsert_student_cohort into table public.students; verifies IDs after write</span>
                  </div>
                </label>
                {!saveToSupabase && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Notice:</strong> Database persistence is disabled. Records will only load into temporary browser session memory and will not appear in Supabase Table Editor.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <span>
                  Supabase database is currently not connected ({supabaseMessage || 'offline'}). Records will load into local session memory.
                </span>
              </div>
            )}

            {/* Error Notice (if save failed) */}
            {applyErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block">Failed to apply import:</strong>
                  <p className="mt-0.5 text-rose-800">{applyErrorMessage}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isApplying}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApply}
                disabled={isApplying}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Cohort...</span>
                  </>
                ) : (
                  <span>
                    {saveToSupabase && supabaseConnected ? 'Confirm & Save to Supabase' : 'Confirm & Apply Cohort'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
