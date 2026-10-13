import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  UploadCloud, 
  GraduationCap, 
  Activity, 
  Sparkles,
  ShieldCheck,
  UserCheck,
  X
} from 'lucide-react';
import { NavTab } from '../../types/student';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  userRole?: string;
  currentIdentityName?: string;
  currentIdentityScope?: string;
  isDemoMode?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  userRole = 'admin',
  currentIdentityName,
  currentIdentityScope,
  isDemoMode = false,
}) => {
  const allNavItems = [
    {
      id: 'overview' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
      description: 'KPI summary & critical alerts',
      badge: 'Live'
    },
    {
      id: 'students' as NavTab,
      label: 'Students',
      icon: Users,
      description: 'Directory & individual profiles',
      badge: 'Cohort'
    },
    {
      id: 'analytics' as NavTab,
      label: 'Analytics',
      icon: BarChart3,
      description: 'Risk correlation & metrics',
      badge: 'Charts'
    },
    {
      id: 'data-import' as NavTab,
      label: 'Data Import',
      icon: UploadCloud,
      description: 'CSV Ingestion & Validation',
      badge: 'Admin'
    },
    {
      id: 'demo-users' as NavTab,
      label: 'Demo Users',
      icon: UserCheck,
      description: 'Persona switcher & permissions',
      badge: 'Personas'
    },
  ];

  // If role is student, provide Student Academic Portal navigation (and Demo Users if in Demo Mode)
  // If teacher, provide Overview, Students, Analytics (and Demo Users if in Demo Mode)
  // If admin, provide all tabs including Data Import and Demo Users
  const navItems = userRole === 'student'
    ? [
        {
          id: 'student-portal' as NavTab,
          label: 'Academic Portal',
          icon: GraduationCap,
          description: 'Personal records & action plan',
          badge: 'Student'
        },
        ...(isDemoMode ? [{
          id: 'demo-users' as NavTab,
          label: 'Demo Personas',
          icon: UserCheck,
          description: 'Switch reviewer persona',
          badge: 'Demo'
        }] : [])
      ]
    : allNavItems.filter((item) => {
        if (item.id === 'data-import' && userRole !== 'admin') {
          return false;
        }
        if (item.id === 'demo-users' && !isDemoMode && userRole !== 'admin') {
          return false;
        }
        return true;
      });

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">EduPulse</span>
                <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-indigo-100 text-indigo-700 tracking-wide uppercase">AI</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Student Success Platform</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hackathon Context Chip */}
        <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/80 rounded-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-indigo-900">KPMG Hackathon Challenge</span>
          </div>
          <p className="mt-1 text-[11px] text-indigo-700/90 leading-relaxed">
            AI-Powered Student Analytics and Success Platform — Prototype Demo
          </p>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Core Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-semibold">{item.label}</div>
                    <div className={`text-[11px] hidden sm:block ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {item.description}
                    </div>
                  </div>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? 'bg-indigo-700 text-indigo-100'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer with Active Persona Card */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="p-3 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">Demo Persona</span>
              </div>
              <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase ${
                userRole === 'admin'
                  ? 'bg-purple-100 text-purple-700'
                  : userRole === 'teacher'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-sky-100 text-sky-700'
              }`}>
                {userRole}
              </span>
            </div>
            
            {currentIdentityName && (
              <p className="mt-1 text-xs font-semibold text-slate-900 truncate" title={currentIdentityName}>
                {currentIdentityName}
              </p>
            )}
            {currentIdentityScope && (
              <p className="mt-0.5 text-[11px] text-slate-500 truncate" title={currentIdentityScope}>
                {currentIdentityScope}
              </p>
            )}

            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <Activity className="w-3 h-3 text-emerald-500" />
                Demo Mode
              </span>
              <span>Local Sandbox</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
