import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, Sparkles, Filter, LogOut, CheckCircle2, ShieldCheck, UserCheck, X } from 'lucide-react';
import { SyntheticBadge } from './SyntheticBadge';
import { NavTab, UserRole } from '../../types/student';

interface HeaderProps {
  currentTab: NavTab;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (dept: string) => void;
  departments: string[];
  userRole?: UserRole | string;
  userEmail?: string;
  userName?: string;
  isDemoSession?: boolean;
  onSignOut?: () => void;
  onOpenDemoUsers?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  selectedDepartment,
  onDepartmentChange,
  departments,
  userRole,
  userEmail,
  userName,
  isDemoSession = true,
  onSignOut,
  onOpenDemoUsers,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Executive Overview',
      subtitle: 'Real-time performance indicators and academic risk signals'
    },
    students: {
      title: 'Student Directory',
      subtitle: 'Complete list of student records, risk profiles, and historical performance'
    },
    analytics: {
      title: 'Analytics & Risk Insights',
      subtitle: 'Departmental benchmarks, factor correlations, and risk distributions'
    },
    'data-import': {
      title: 'Data Ingestion & Validation',
      subtitle: 'PapaParse CSV validation pipeline, error reporting & explainable score calculation'
    },
    'student-portal': {
      title: 'Student Academic Portal',
      subtitle: 'Personal performance breakdown, attendance tracking & explainable AI recommendations'
    },
    'demo-users': {
      title: 'Demo Identity Management',
      subtitle: 'Inspect and switch between preconfigured Admin, Faculty Mentor, and Student test personas'
    }
  };

  const { title, subtitle } = tabTitles[currentTab] || {
    title: 'EduPulse AI Dashboard',
    subtitle: 'AI-Powered Student Analytics and Success Platform'
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Menu + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {title}
              </h1>
              <SyntheticBadge size="sm" />
            </div>
            <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Search, Filter, Status */}
        <div className="flex items-center gap-2.5">
          {/* Search Box (hidden on overview/demo-users/student-portal) */}
          {currentTab === 'students' && (
            <div className="relative hidden md:block w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or ID..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          )}

          {/* Department Quick Filter */}
          {currentTab === 'students' && (
            <div className="relative hidden lg:flex items-center">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <select
                value={selectedDepartment}
                onChange={(e) => onDepartmentChange(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notifications Drawer (Functional, Resolves Dead Control Issue) */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative cursor-pointer"
              title="System Status & Alerts"
              aria-label="System status alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
            </button>

            {/* Notification Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">System Activity</span>
                  </div>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-3 space-y-2.5 text-xs">
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-emerald-950">Scoring Engine Online</div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">Deterministic 6-factor model loaded (CGPA 35%, Att 20%, LMS 15%, Eng 10%, Skill 10%, Place 10%).</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-indigo-950">Synthetic Demo Cohort Active</div>
                      <div className="text-[11px] text-indigo-700 mt-0.5">20 benchmark records populated across 6 departments. Zero remote dependencies.</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2">
                    <UserCheck className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-800">Role Scoping Active</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Admin, Faculty Mentor, and Student personas ready for hackathon demonstration.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Role & User Badge */}
          {userRole && (
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize flex items-center gap-1.5 ${
                userRole === 'admin'
                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                  : userRole === 'teacher'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-sky-100 text-sky-800 border-sky-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  userRole === 'admin' ? 'bg-purple-600' : userRole === 'teacher' ? 'bg-emerald-600' : 'bg-sky-600'
                }`} />
                <span>{userRole}</span>
              </span>

              {userName && (
                <span className="text-xs text-slate-700 font-semibold hidden md:inline truncate max-w-[160px]" title={userEmail ? `${userName} (${userEmail})` : userName}>
                  {userName}
                </span>
              )}

              {isDemoSession && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 hidden sm:inline">
                  DEMO
                </span>
              )}
            </div>
          )}

          {/* Quick Demo Switcher Shortcut */}
          {onOpenDemoUsers && (
            <button
              onClick={onOpenDemoUsers}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Open Demo Personas & Identity Switcher"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Switch Persona</span>
            </button>
          )}

          {/* Sign Out Button */}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out / Exit Demo"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* KPMG Hackathon Pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            <span>KPMG AI Hackathon</span>
          </div>
        </div>
      </div>
    </header>
  );
};
