import React from 'react';
import { Menu, Search, Bell, Sparkles, Filter } from 'lucide-react';
import { SyntheticBadge } from './SyntheticBadge';
import { NavTab } from '../../types/student';

interface HeaderProps {
  currentTab: NavTab;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (dept: string) => void;
  departments: string[];
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
  selectedDepartment,
  onDepartmentChange,
  departments
}) => {
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
    }
  };

  const { title, subtitle } = tabTitles[currentTab];

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Menu + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
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
          {/* Search Box */}
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

          {/* Department Quick Filter */}
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

          {/* Notification Indicator */}
          <div className="relative">
            <button
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative"
              title="System Alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600"></span>
            </button>
          </div>

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
