import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Sidebar 
} from './components/common/Sidebar';
import { 
  Header 
} from './components/common/Header';
import { 
  OverviewTab 
} from './components/dashboard/OverviewTab';
import { 
  StudentsTab 
} from './components/dashboard/StudentsTab';
import { 
  AnalyticsTab 
} from './components/dashboard/AnalyticsTab';
import { 
  DataImportTab 
} from './components/dashboard/DataImportTab';
import { 
  StudentDetailModal 
} from './components/dashboard/StudentDetailModal';
import { 
  LoadingState 
} from './components/common/LoadingState';
import { 
  ErrorState 
} from './components/common/ErrorState';
import { 
  SYNTHETIC_STUDENTS 
} from './data/syntheticStudents';
import { 
  NavTab, 
  Student,
  DatasetSource,
  SupabaseConnectionStatus 
} from './types/student';
import { 
  RotateCw, 
  Sparkles, 
  ShieldCheck, 
  Info,
  Bug,
  RotateCcw,
  Database,
  RefreshCw
} from 'lucide-react';
import {
  checkSupabaseConnection,
  fetchStudentsFromSupabase,
  replaceCohortInSupabase
} from './services/studentService';
import {
  isSupabaseConfigured
} from './services/supabaseClient';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Active Cohort State (Single Source of Truth)
  const [activeStudents, setActiveStudents] = useState<Student[]>(SYNTHETIC_STUDENTS);
  const [datasetSource, setDatasetSource] = useState<DatasetSource>('Synthetic Demo');
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  // Supabase Integration State
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseConnectionStatus>('unconfigured');
  const [supabaseMessage, setSupabaseMessage] = useState<string>('');
  const [supabaseRecordCount, setSupabaseRecordCount] = useState<number | null>(null);

  // States to demonstrate loading & error handling without artificial bugs
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Extract distinct departments from currently active dataset
  const departments = useMemo(() => {
    return Array.from(new Set(activeStudents.map(s => s.department))).sort();
  }, [activeStudents]);

  // Filter students by current global search and department
  const filteredStudents = useMemo(() => {
    return activeStudents.filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.department.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDept = 
        selectedDepartment === 'ALL' || s.department === selectedDepartment;

      return matchesSearch && matchesDept;
    });
  }, [activeStudents, searchQuery, selectedDepartment]);

  // Initial Supabase connection check & safe auto-load
  const checkAndLoadSupabase = useCallback(async (attemptAutoLoad = true) => {
    if (!isSupabaseConfigured()) {
      setSupabaseStatus('unconfigured');
      setSupabaseMessage('EduPulse-AI Supabase credentials not set. Running in Demo mode.');
      return;
    }

    setSupabaseStatus('connecting');
    setSupabaseMessage('Connecting to EduPulse-AI Supabase...');

    try {
      const health = await checkSupabaseConnection();
      if (health.connected) {
        setSupabaseStatus('connected');
        setSupabaseMessage(health.message);
        setSupabaseRecordCount(health.count ?? 0);

        if (attemptAutoLoad && (health.count ?? 0) > 0) {
          const fetchRes = await fetchStudentsFromSupabase();
          if (!fetchRes.error && fetchRes.data.length > 0) {
            setActiveStudents(fetchRes.data);
            setDatasetSource('Supabase DB');
            setImportedFileName(null);
          }
        }
      } else {
        setSupabaseStatus('error');
        setSupabaseMessage(health.message);
      }
    } catch (err: any) {
      setSupabaseStatus('error');
      setSupabaseMessage(`Connection failed: ${err?.message || 'Network error'}`);
    }
  }, []);

  useEffect(() => {
    checkAndLoadSupabase(true);
  }, [checkAndLoadSupabase]);

  // Load from Supabase on demand
  const handleLoadFromSupabase = async () => {
    setIsLoading(true);
    setHasError(false);
    const res = await fetchStudentsFromSupabase();
    setIsLoading(false);

    if (res.error) {
      setHasError(true);
      setErrorMessage(`Failed to load cohort from Supabase: ${res.error}`);
      return;
    }
    if (res.data.length === 0) {
      setHasError(true);
      setErrorMessage('The public.students table in Supabase is currently empty. Upload a verified CSV to populate records.');
      return;
    }

    setActiveStudents(res.data);
    setDatasetSource('Supabase DB');
    setImportedFileName(null);
    setSupabaseRecordCount(res.data.length);
    setSelectedDepartment('ALL');
    setSearchQuery('');
  };

  // Apply imported CSV student dataset
  const handleApplyImport = async (
    importedStudents: Student[],
    fileName: string,
    saveToSupabase: boolean = false
  ): Promise<{ success: boolean; error?: string | null }> => {
    if (saveToSupabase && isSupabaseConfigured()) {
      setIsLoading(true);
      const saveRes = await replaceCohortInSupabase(importedStudents);
      setIsLoading(false);

      if (!saveRes.success) {
        return { success: false, error: saveRes.error };
      }

      setActiveStudents(importedStudents);
      setDatasetSource('Supabase DB');
      setImportedFileName(fileName);
      setSupabaseRecordCount(saveRes.count);
      setHasError(false);
      setSelectedDepartment('ALL');
      setSearchQuery('');
      return { success: true };
    }

    // Local-only session apply
    setActiveStudents(importedStudents);
    setDatasetSource('Imported CSV');
    setImportedFileName(fileName);
    setHasError(false);
    setSelectedDepartment('ALL');
    setSearchQuery('');
    return { success: true };
  };

  // Restore synthetic demo dataset (preserves Supabase database records)
  const handleRestoreSyntheticDemo = () => {
    setActiveStudents(SYNTHETIC_STUDENTS);
    setDatasetSource('Synthetic Demo');
    setImportedFileName(null);
    setHasError(false);
    setSelectedDepartment('ALL');
    setSearchQuery('');
  };

  // Simulate refresh / reload
  const handleSimulateReload = () => {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  // Simulate error state trigger for verification
  const handleTriggerErrorSimulation = () => {
    setHasError(true);
    setErrorMessage('Simulated API gateway error: Dataset verification interrupted. Click retry to recover.');
  };

  const handleResetError = () => {
    setHasError(false);
    setErrorMessage('');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setHasError(false);
        }}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedDepartment={selectedDepartment}
          onDepartmentChange={setSelectedDepartment}
          departments={departments}
        />

        {/* Unified Dataset & Sandbox Toolbar */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Active Dataset:
            </span>
            <span className={`px-2 py-0.5 rounded font-mono font-medium border ${
              datasetSource === 'Synthetic Demo'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : datasetSource === 'Supabase DB'
                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {datasetSource} • {activeStudents.length} Students {importedFileName ? `(${importedFileName})` : ''}
            </span>

            {/* Supabase Connection Status Badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-medium border ${
              supabaseStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : supabaseStatus === 'connecting'
                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                : supabaseStatus === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`} title={supabaseMessage}>
              <Database className="w-3 h-3" />
              <span>
                {supabaseStatus === 'connected' 
                  ? `Supabase DB (${supabaseRecordCount ?? 0})` 
                  : supabaseStatus === 'connecting'
                  ? 'Connecting...'
                  : supabaseStatus === 'error'
                  ? 'Supabase Error'
                  : 'Supabase: Off (Demo)'}
              </span>
            </span>

            {/* Load from DB button if DB is connected and active dataset is not DB */}
            {supabaseStatus === 'connected' && datasetSource !== 'Supabase DB' && (supabaseRecordCount ?? 0) > 0 && (
              <button
                onClick={handleLoadFromSupabase}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded transition-colors"
                title="Load student cohort from Supabase database"
              >
                <RefreshCw className="w-3 h-3 text-indigo-600" />
                <span>Load DB</span>
              </button>
            )}

            {datasetSource !== 'Synthetic Demo' && (
              <button
                onClick={handleRestoreSyntheticDemo}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded transition-colors"
                title="Restore original 20-student synthetic demo cohort without touching database records"
              >
                <RotateCcw className="w-3 h-3 text-indigo-600" />
                <span>Restore Demo</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => checkAndLoadSupabase(false)}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 hover:text-slate-900 transition-colors"
              title="Test live Supabase connection"
            >
              <RefreshCw className="w-3 h-3 text-indigo-600" />
              <span>Check DB</span>
            </button>
            <button
              onClick={handleSimulateReload}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 hover:text-slate-900 transition-colors"
              title="Test smooth loading animation"
            >
              <RotateCw className="w-3 h-3 text-indigo-600" />
              <span>Simulate Refresh</span>
            </button>
            <button
              onClick={hasError ? handleResetError : handleTriggerErrorSimulation}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                hasError 
                  ? 'bg-rose-600 text-white border-rose-600' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="Toggle error state for testing"
            >
              <Bug className="w-3 h-3 text-amber-600" />
              <span>{hasError ? 'Reset Error' : 'Test Error State'}</span>
            </button>
          </div>
        </div>

        {/* Tab Body View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {isLoading ? (
            <LoadingState 
              message="Loading student analytics..."
              subMessage="Synchronizing cohort data"
            />
          ) : hasError ? (
            <ErrorState
              title="Application Notice"
              message={errorMessage || 'An unexpected condition was simulated in the application pipeline.'}
              onRetry={handleResetError}
            />
          ) : (
            <>
              {currentTab === 'overview' && (
                <OverviewTab
                  students={filteredStudents}
                  onNavigateTab={setCurrentTab}
                  onSelectStudent={setSelectedStudent}
                  datasetSource={datasetSource}
                />
              )}

              {currentTab === 'students' && (
                <StudentsTab
                  students={activeStudents}
                  onSelectStudent={setSelectedStudent}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  selectedDepartment={selectedDepartment}
                  onDepartmentChange={setSelectedDepartment}
                  departments={departments}
                  datasetSource={datasetSource}
                />
              )}

              {currentTab === 'analytics' && (
                <AnalyticsTab
                  students={filteredStudents.length > 0 ? filteredStudents : activeStudents}
                  datasetSource={datasetSource}
                />
              )}

              {currentTab === 'data-import' && (
                <DataImportTab 
                  onApplyImport={handleApplyImport}
                  datasetSource={datasetSource}
                  totalActiveStudents={activeStudents.length}
                  onRestoreSyntheticDemo={handleRestoreSyntheticDemo}
                  supabaseConfigured={isSupabaseConfigured()}
                  supabaseConnected={supabaseStatus === 'connected'}
                  supabaseMessage={supabaseMessage}
                  onRefreshFromSupabase={handleLoadFromSupabase}
                />
              )}
            </>
          )}
        </main>

        {/* Platform Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-slate-700">EduPulse AI</span>
              <span>— Student Success Platform</span>
              <span className="hidden md:inline text-slate-300">•</span>
              <span className="hidden md:inline">KPMG in India Hackathon Challenge</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <Info className="w-3 h-3" />
                Illustrative scoring methodology • Non-clinical AI
              </span>
              <span>Milestone 3: Supabase Ready</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Student Details Inspection Modal */}
      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
};

export default App;
