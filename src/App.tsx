import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  StudentPortalTab 
} from './components/dashboard/StudentPortalTab';
import { 
  DemoUsersTab 
} from './components/dashboard/DemoUsersTab';
import { 
  LoginView 
} from './components/auth/LoginView';
import { 
  LoadingState 
} from './components/common/LoadingState';
import { 
  ErrorState 
} from './components/common/ErrorState';
import { 
  SYNTHETIC_STUDENTS,
  DEMO_IDENTITIES,
  DEFAULT_DEMO_IDENTITY,
  TEACHER_ASSIGNED_CLASS
} from './data/syntheticStudents';
import { 
  NavTab, 
  Student,
  DatasetSource,
  SupabaseConnectionStatus,
  UserRole,
  UserProfile,
  DemoIdentity
} from './types/student';
import { 
  RotateCw, 
  Sparkles, 
  ShieldCheck, 
  Info, 
  Bug, 
  RotateCcw, 
  Database, 
  RefreshCw, 
  UserCheck 
} from 'lucide-react';
import {
  checkSupabaseConnection,
  fetchStudentsFromSupabase,
  insertStudentToSupabase,
  replaceCohortInSupabase,
  updateStudentMarksInSupabase
} from './services/studentService';
import {
  isSupabaseConfigured,
  getSupabaseClient
} from './services/supabaseClient';
import {
  fetchUserProfile,
  signOutUser
} from './services/authService';
import {
  calculateStudentSuccessScore
} from './utils/scoringEngine';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Preconfigured Demo Identity State (Stage 3 Hackathon Demo System)
  const [currentDemoIdentity, setCurrentDemoIdentity] = useState<DemoIdentity>(DEFAULT_DEMO_IDENTITY);

  // Authentication & RBAC State
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured());
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('student'); // Secure default: student, NOT admin!
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!isSupabaseConfigured());

  // Ref to guard against asynchronous session checks overriding active Demo mode
  const isDemoModeRef = useRef(isDemoMode);
  useEffect(() => {
    isDemoModeRef.current = isDemoMode;
  }, [isDemoMode]);

  // Active Cohort State (Single Source of Truth)
  const [activeStudents, setActiveStudents] = useState<Student[]>(SYNTHETIC_STUDENTS);
  const [datasetSource, setDatasetSource] = useState<DatasetSource>('Synthetic Demo');
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  // Supabase Integration State
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseConnectionStatus>('unconfigured');
  const [supabaseMessage, setSupabaseMessage] = useState<string>('');
  const [supabaseRecordCount, setSupabaseRecordCount] = useState<number | null>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Effective cohort scoping based on active role & demo identity:
  // When teacher role is active, teachers are scoped to their assigned class section (CS-301)
  const effectiveCohort = useMemo(() => {
    if (currentUserRole === 'teacher' && datasetSource === 'Synthetic Demo') {
      return activeStudents.filter(s => TEACHER_ASSIGNED_CLASS.studentIds.includes(s.studentId));
    }
    return activeStudents;
  }, [activeStudents, currentUserRole, datasetSource]);

  // Extract distinct departments from effective cohort
  const departments = useMemo(() => {
    return Array.from(new Set(effectiveCohort.map(s => s.department))).sort();
  }, [effectiveCohort]);

  // Filter students by current search and department
  const filteredStudents = useMemo(() => {
    return effectiveCohort.filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.department.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDept = 
        selectedDepartment === 'ALL' || s.department === selectedDepartment;

      return matchesSearch && matchesDept;
    });
  }, [effectiveCohort, searchQuery, selectedDepartment]);

  // Resolve active student record for the Student Academic Portal
  const currentStudentForPortal = useMemo(() => {
    if (currentDemoIdentity.assignedStudentId) {
      const matched = activeStudents.find(s => s.studentId === currentDemoIdentity.assignedStudentId);
      if (matched) return matched;
    }
    return activeStudents[0];
  }, [activeStudents, currentDemoIdentity]);

  // Handle Demo Identity change logic (Stage 2 & 3)
  const handleSelectDemoIdentity = (identity: DemoIdentity) => {
    // Live authenticated guard: in live mode, role is anchored to verified database profile
    if (!isDemoMode && currentUserProfile) {
      if (identity.role !== currentUserProfile.role) {
        alert(`Persona change blocked: You are currently signed in with authenticated ${currentUserProfile.role} credentials (${currentUserProfile.email}). Role switching is only permitted in Offline Demo Mode.`);
        return;
      }
    }

    setCurrentDemoIdentity(identity);
    setCurrentUserRole(identity.role);
    setSelectedDepartment('ALL');
    setSearchQuery('');
    setHasError(false);

    if (identity.role === 'student') {
      setCurrentTab('student-portal');
    } else if (currentTab === 'student-portal') {
      setCurrentTab('overview');
    }
  };

  // Handle role switcher button click (maps directly to preconfigured persona)
  const handleSelectRole = (role: UserRole) => {
    if (!isDemoMode && currentUserProfile) {
      if (role !== currentUserProfile.role) {
        alert(`Role switch blocked: Active session is authenticated as verified ${currentUserProfile.role}. Role switching is available in Offline Demo Mode.`);
        return;
      }
    }
    const targetIdentity = DEMO_IDENTITIES.find(i => i.role === role) || DEFAULT_DEMO_IDENTITY;
    handleSelectDemoIdentity(targetIdentity);
  };

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

        if (attemptAutoLoad && !isDemoModeRef.current && (health.count ?? 0) > 0) {
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

  // Supabase Auth session detection & reactive state listener (Stage 5)
  useEffect(() => {
    checkAndLoadSupabase(true);

    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      if (client) {
        // Initial session restoration check
        client.auth.getSession().then(async ({ data, error }) => {
          if (isDemoModeRef.current) {
            return;
          }
          if (error || !data?.session?.user) {
            if (!isDemoModeRef.current) {
              setIsAuthenticated(false);
              setIsDemoMode(false);
              setCurrentUserProfile(null);
              setCurrentUserRole('student');
            }
            return;
          }

          const profileRes = await fetchUserProfile(data.session.user.id);
          if (isDemoModeRef.current) {
            return;
          }
          if (profileRes.profile && profileRes.profile.isActive) {
            setIsAuthenticated(true);
            setIsDemoMode(false);
            setCurrentUserProfile(profileRes.profile);
            setCurrentUserRole(profileRes.profile.role);
            if (profileRes.profile.role === 'student') {
              setCurrentTab('student-portal');
            }
            // Auto-load live cohort from Supabase
            const fetchRes = await fetchStudentsFromSupabase();
            if (!fetchRes.error && fetchRes.data.length > 0) {
              setActiveStudents(fetchRes.data);
              setDatasetSource('Supabase DB');
              setSupabaseRecordCount(fetchRes.data.length);
            }
          } else {
            // Profile missing, deactivated, or relation does not exist
            await client.auth.signOut();
            setIsAuthenticated(false);
            setIsDemoMode(false);
            setCurrentUserProfile(null);
            setCurrentUserRole('student');
            if (profileRes.error) {
              setHasError(true);
              setErrorMessage(profileRes.error);
            }
          }
        });

        // Reactive Auth State Change Subscription
        const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
          if (isDemoModeRef.current) {
            return;
          }
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              const res = await fetchUserProfile(session.user.id);
              if (isDemoModeRef.current) {
                return;
              }
              if (res.profile && res.profile.isActive) {
                setIsAuthenticated(true);
                setIsDemoMode(false);
                setCurrentUserProfile(res.profile);
                setCurrentUserRole(res.profile.role);
                if (res.profile.role === 'student') {
                  setCurrentTab('student-portal');
                }
              } else {
                await client.auth.signOut();
                setIsAuthenticated(false);
                setIsDemoMode(false);
                setCurrentUserProfile(null);
                setCurrentUserRole('student');
                if (res.error) {
                  setHasError(true);
                  setErrorMessage(res.error);
                }
              }
            }
          } else if (event === 'SIGNED_OUT') {
            if (!isDemoModeRef.current) {
              setIsAuthenticated(false);
              setIsDemoMode(false);
              setCurrentUserProfile(null);
              setCurrentUserRole('student');
              setCurrentTab('overview');
            }
          }
        });

        return () => {
          authListener?.subscription?.unsubscribe();
        };
      }
    }
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

  // Apply imported CSV student dataset (Admin only)
  const handleApplyImport = async (
    importedStudents: Student[],
    fileName: string,
    saveToSupabase: boolean = false,
    importMode: 'merge' | 'replace' = 'merge'
  ): Promise<{ success: boolean; count?: number; error?: string | null }> => {
    // Construct target cohort based on importMode:
    // 'merge' appends new incoming students to the active cohort and updates matching IDs up to 100 capacity
    // 'replace' loads only the file's records up to 100 capacity
    let targetCohort: Student[];
    if (importMode === 'merge') {
      const incomingMap = new Map(importedStudents.map(s => [s.studentId, s]));
      const updatedExisting = activeStudents.map(s => incomingMap.get(s.studentId) || s);
      const existingIdSet = new Set(activeStudents.map(s => s.studentId));
      const newlyAdded = importedStudents.filter(s => !existingIdSet.has(s.studentId));
      targetCohort = [...updatedExisting, ...newlyAdded].slice(0, 100);
    } else {
      targetCohort = importedStudents.slice(0, 100);
    }

    // Safeguard: Demo mode must never write to remote Supabase
    if (isDemoMode) {
      if (saveToSupabase) {
        return {
          success: false,
          error: 'Database Persistence Blocked: Remote database writes are disabled in Offline Demo Mode. Sign in with verified institutional administrator credentials to persist to live Supabase.',
        };
      }

      // Local-only session apply
      setActiveStudents(targetCohort);
      setDatasetSource('Imported CSV');
      setImportedFileName(fileName);
      setHasError(false);
      setSelectedDepartment('ALL');
      setSearchQuery('');
      return { success: true, count: 0 };
    }

    // Live Mode: Derive authorization strictly from server-verified profile
    if (!currentUserProfile || currentUserProfile.role !== 'admin' || !currentUserProfile.isActive) {
      return {
        success: false,
        error: 'Unauthorized: Only verified institutional Administrators can import cohorts to Supabase.',
      };
    }

    if (saveToSupabase && isSupabaseConfigured()) {
      setIsLoading(true);
      const saveRes = await replaceCohortInSupabase(targetCohort);
      setIsLoading(false);

      if (!saveRes.success) {
        return { success: false, error: saveRes.error };
      }

      // Re-fetch from Supabase to verify persisted records and refresh state
      const fetchRes = await fetchStudentsFromSupabase();
      if (!fetchRes.error && fetchRes.data.length > 0) {
        setActiveStudents(fetchRes.data);
        setSupabaseRecordCount(fetchRes.data.length);
        setDatasetSource('Supabase DB');
        setImportedFileName(fileName);
        setHasError(false);
        setSelectedDepartment('ALL');
        setSearchQuery('');
        return { success: true, count: fetchRes.data.length };
      }

      // Verification failed: Database returned 0 rows or error. Never claim success.
      return {
        success: false,
        error: fetchRes.error || `Database write verification failed: 0 rows returned from Supabase public.students after write attempt. Persistence could not be confirmed.`,
      };
    }

    // Local-only session apply for live admin
    setActiveStudents(targetCohort);
    setDatasetSource('Imported CSV');
    setImportedFileName(fileName);
    setHasError(false);
    setSelectedDepartment('ALL');
    setSearchQuery('');
    return { success: true, count: 0 };
  };

  // Add individual student record (Admin only)
  const handleAddStudent = async (
    newStudent: Student,
    saveToDb: boolean = false
  ): Promise<{ success: boolean; error?: string | null }> => {
    if (isDemoMode) {
      if (saveToDb) {
        return {
          success: false,
          error: 'Database Persistence Blocked: Remote database writes are disabled in Offline Demo Mode. Sign in with verified institutional administrator credentials to persist to live Supabase.',
        };
      }
      setActiveStudents(prev => [newStudent, ...prev.filter(s => s.studentId !== newStudent.studentId)]);
      setHasError(false);
      return { success: true };
    }

    if (!currentUserProfile || currentUserProfile.role !== 'admin' || !currentUserProfile.isActive) {
      return { success: false, error: 'Unauthorized: Only verified institutional Administrators can add student records to the database.' };
    }

    if (saveToDb && isSupabaseConfigured()) {
      setIsLoading(true);
      const res = await insertStudentToSupabase(newStudent);
      setIsLoading(false);

      if (!res.success) {
        return { success: false, error: res.error };
      }

      const inserted = res.data || newStudent;
      setActiveStudents(prev => [inserted, ...prev.filter(s => s.studentId !== inserted.studentId)]);
      setDatasetSource('Supabase DB');
      setSupabaseRecordCount(prev => (prev ?? 0) + 1);
      setHasError(false);
      return { success: true };
    }

    // Local session add
    setActiveStudents(prev => [newStudent, ...prev.filter(s => s.studentId !== newStudent.studentId)]);
    setHasError(false);
    return { success: true };
  };

  // Teacher / Admin mark modification with audited parity calculation
  const handleSaveMarks = async (
    studentId: string,
    attendance: number,
    assignment: number
  ): Promise<{ success: boolean; error?: string | null }> => {
    if (isDemoMode) {
      if (currentUserRole !== 'teacher' && currentUserRole !== 'admin') {
        return { success: false, error: 'Unauthorized: Students cannot modify marks.' };
      }
    } else {
      if (!currentUserProfile || (currentUserProfile.role !== 'teacher' && currentUserProfile.role !== 'admin') || !currentUserProfile.isActive) {
        return { success: false, error: 'Unauthorized: Active faculty or administrator permissions required.' };
      }

      // If active dataset is live Supabase, call audited RPC
      if (datasetSource === 'Supabase DB' && isSupabaseConfigured()) {
        const res = await updateStudentMarksInSupabase(studentId, attendance, assignment);
        if (!res.success) {
          return { success: false, error: res.error };
        }
      }
    }

    // Update state and recalculate exact scoring metrics via deterministic engine
    const updater = (s: Student): Student => {
      if (s.studentId !== studentId) return s;
      const updatedScores = calculateStudentSuccessScore({
        cgpa: s.cgpa,
        attendanceRate: attendance,
        assignmentScore: assignment,
        engagementScore: s.engagementScore,
        technicalSkillsRating: s.technicalSkillsRating,
        placementReadinessScore: s.placementReadinessScore,
      });

      return {
        ...s,
        attendanceRate: attendance,
        assignmentScore: assignment,
        successScore: updatedScores.successScore,
        academicRisk: updatedScores.academicRisk,
        placementRisk: updatedScores.placementRisk,
        scoreBreakdown: updatedScores.scoreBreakdown,
        hasInsufficientData: updatedScores.hasInsufficientData,
        incompleteReasons: updatedScores.incompleteReasons,
        lastUpdated: new Date().toISOString(),
      };
    };

    setActiveStudents(prev => prev.map(updater));
    setSelectedStudent(prev => (prev ? updater(prev) : null));

    return { success: true };
  };

  // Sign out handler
  const handleSignOut = async () => {
    isDemoModeRef.current = false;
    await signOutUser();
    setIsAuthenticated(false);
    setIsDemoMode(false);
    setCurrentUserProfile(null);
    setCurrentUserRole('student');
    handleSelectDemoIdentity(DEFAULT_DEMO_IDENTITY);
    setCurrentTab('overview');
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
    }, 400);
  };

  // Error simulation toggle
  const handleTriggerErrorSimulation = () => {
    setHasError(true);
    setErrorMessage('Simulated API gateway error: Dataset verification interrupted. Click retry to recover.');
  };

  const handleResetError = () => {
    setHasError(false);
    setErrorMessage('');
    setIsLoading(false);
  };

  // Render Login view if Supabase is configured and user is not authenticated
  if (isSupabaseConfigured() && !isAuthenticated) {
    return (
      <LoginView
        onSuccess={async () => {
          const client = getSupabaseClient();
          if (client) {
            const { data } = await client.auth.getUser();
            if (data?.user) {
              const profileRes = await fetchUserProfile(data.user.id);
              if (profileRes.profile && profileRes.profile.isActive) {
                isDemoModeRef.current = false;
                setIsAuthenticated(true);
                setIsDemoMode(false);
                setCurrentUserProfile(profileRes.profile);
                setCurrentUserRole(profileRes.profile.role);
                setHasError(false);
                setErrorMessage('');
                if (profileRes.profile.role === 'student') {
                  setCurrentTab('student-portal');
                } else {
                  setCurrentTab('overview');
                }
                const fetchRes = await fetchStudentsFromSupabase();
                if (!fetchRes.error && fetchRes.data.length > 0) {
                  setActiveStudents(fetchRes.data);
                  setDatasetSource('Supabase DB');
                  setSupabaseRecordCount(fetchRes.data.length);
                }
              } else {
                await client.auth.signOut();
                isDemoModeRef.current = false;
                setIsAuthenticated(false);
                setIsDemoMode(false);
                setCurrentUserProfile(null);
                setCurrentUserRole('student');
                setHasError(true);
                setErrorMessage(profileRes.error || 'User profile could not be verified in public.profiles.');
              }
            }
          }
        }}
        onEnterDemoMode={(demoRole) => {
          const role = demoRole || 'admin';
          const identity = DEMO_IDENTITIES.find(i => i.role === role) || DEFAULT_DEMO_IDENTITY;
          isDemoModeRef.current = true;
          setIsDemoMode(true);
          setIsAuthenticated(true);
          setCurrentUserProfile(null);
          setActiveStudents(SYNTHETIC_STUDENTS);
          setDatasetSource('Synthetic Demo');
          setImportedFileName(null);
          setHasError(false);
          setErrorMessage('');
          handleSelectDemoIdentity(identity);
          if (role === 'student') {
            setCurrentTab('student-portal');
          } else {
            setCurrentTab('overview');
          }
        }}
        isSupabaseConnected={supabaseStatus === 'connected'}
      />
    );
  }

  // Current display email & name
  const displayEmail = currentUserProfile?.email || currentDemoIdentity.email;
  const displayName = currentUserProfile?.fullName || currentDemoIdentity.name;

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
        userRole={currentUserRole}
        currentIdentityName={displayName}
        currentIdentityScope={currentDemoIdentity.assignedScope}
        isDemoMode={isDemoMode}
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
          userRole={currentUserRole}
          userEmail={displayEmail}
          userName={displayName}
          isDemoSession={isDemoMode || datasetSource === 'Synthetic Demo'}
          onSignOut={handleSignOut}
          onOpenDemoUsers={() => setCurrentTab('demo-users')}
        />

        {/* Unified Dataset & Persona Toolbar */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center flex-wrap gap-2">
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
              {datasetSource} • {effectiveCohort.length} {currentUserRole === 'teacher' ? 'Assigned' : 'Total'} Students {importedFileName ? `(${importedFileName})` : ''}
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

            {/* Role Switcher Toolbar for Reviewers & Testing */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-slate-200 shadow-2xs">
              <span className="px-1.5 text-slate-500 font-semibold flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-indigo-600" />
                Role:
              </span>
              {(['admin', 'teacher', 'student'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleSelectRole(r)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    currentUserRole === r
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={`Switch active view to ${r} persona`}
                >
                  {r}
                </button>
              ))}

              <button
                onClick={() => setCurrentTab('demo-users')}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                  currentTab === 'demo-users'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'text-indigo-600 hover:bg-indigo-50'
                }`}
                title="Manage all 4 preconfigured demo identities"
              >
                Personas
              </button>
            </div>

            {/* Load from DB button if DB is connected and active dataset is not DB */}
            {supabaseStatus === 'connected' && datasetSource !== 'Supabase DB' && (supabaseRecordCount ?? 0) > 0 && (
              <button
                onClick={handleLoadFromSupabase}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded transition-colors cursor-pointer"
                title="Load student cohort from Supabase database"
              >
                <RefreshCw className="w-3 h-3 text-indigo-600" />
                <span>Load DB</span>
              </button>
            )}

            {datasetSource !== 'Synthetic Demo' && (
              <button
                onClick={handleRestoreSyntheticDemo}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
                title="Restore original 20-student synthetic demo cohort"
              >
                <RotateCcw className="w-3 h-3 text-indigo-600" />
                <span>Restore Demo</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => checkAndLoadSupabase(false)}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
              title="Test live Supabase connection"
            >
              <RefreshCw className="w-3 h-3 text-indigo-600" />
              <span>Check DB</span>
            </button>
            <button
              onClick={handleSimulateReload}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
              title="Test smooth loading animation"
            >
              <RotateCw className="w-3 h-3 text-indigo-600" />
              <span>Refresh</span>
            </button>
            <button
              onClick={hasError ? handleResetError : handleTriggerErrorSimulation}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                hasError 
                  ? 'bg-rose-600 text-white border-rose-600' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="Toggle error state for testing"
            >
              <Bug className="w-3 h-3 text-amber-600" />
              <span>{hasError ? 'Reset Error' : 'Test Error'}</span>
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
              {currentTab === 'student-portal' && (
                <StudentPortalTab
                  student={currentStudentForPortal}
                />
              )}

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
                  students={effectiveCohort}
                  onSelectStudent={setSelectedStudent}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  selectedDepartment={selectedDepartment}
                  onDepartmentChange={setSelectedDepartment}
                  departments={departments}
                  datasetSource={datasetSource}
                  userRole={currentUserRole}
                  assignedClassInfo={currentUserRole === 'teacher' ? {
                    ...TEACHER_ASSIGNED_CLASS,
                    studentCount: effectiveCohort.length
                  } : undefined}
                  onAddStudent={handleAddStudent}
                  isSupabaseConnected={supabaseStatus === 'connected'}
                  isDemoMode={isDemoMode}
                  isVerifiedAdmin={Boolean(currentUserProfile && currentUserProfile.role === 'admin' && currentUserProfile.isActive)}
                />
              )}

              {currentTab === 'analytics' && (
                <AnalyticsTab
                  students={filteredStudents.length > 0 ? filteredStudents : effectiveCohort}
                  datasetSource={datasetSource}
                />
              )}

              {currentTab === 'data-import' && (isDemoMode ? currentUserRole === 'admin' : currentUserProfile?.role === 'admin') && (
                <DataImportTab 
                  onApplyImport={handleApplyImport}
                  datasetSource={datasetSource}
                  totalActiveStudents={activeStudents.length}
                  onRestoreSyntheticDemo={handleRestoreSyntheticDemo}
                  supabaseConfigured={isSupabaseConfigured()}
                  supabaseConnected={supabaseStatus === 'connected'}
                  supabaseMessage={supabaseMessage}
                  onRefreshFromSupabase={handleLoadFromSupabase}
                  isDemoMode={isDemoMode}
                  isVerifiedAdmin={Boolean(currentUserProfile && currentUserProfile.role === 'admin' && currentUserProfile.isActive)}
                />
              )}

              {currentTab === 'demo-users' && (
                <DemoUsersTab 
                  currentIdentityId={currentDemoIdentity.id}
                  onSelectIdentity={handleSelectDemoIdentity}
                  onResetDemoData={handleRestoreSyntheticDemo}
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
              <span className="hidden md:inline">KPMG Hackathon Challenge</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <Info className="w-3 h-3" />
                Deterministic Scoring • Synthetic Data • Safe Local Demo
              </span>
              <span>Hackathon Prototype v0.1</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Student Details Inspection Modal */}
      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        canEditMarks={currentUserRole === 'teacher' || currentUserRole === 'admin'}
        isDemoMode={datasetSource !== 'Supabase DB' || !isSupabaseConfigured()}
        onSaveMarks={handleSaveMarks}
      />
    </div>
  );
};

export default App;
