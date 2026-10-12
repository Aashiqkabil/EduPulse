import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  SlidersHorizontal, 
  CheckCircle, 
  ExternalLink,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Student } from '../../types/student';
import { EmptyState } from '../common/EmptyState';
import { SyntheticBadge } from '../common/SyntheticBadge';

interface StudentsTabProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (dept: string) => void;
  departments: string[];
  datasetSource: string;
  userRole?: string;
  assignedClassInfo?: {
    code: string;
    name: string;
    department: string;
    semester: number;
    section: string;
    studentCount: number;
  };
}

type SortField = 'studentId' | 'name' | 'cgpa' | 'attendanceRate' | 'successScore';
type SortOrder = 'asc' | 'desc';

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  onSelectStudent,
  searchQuery,
  onSearchChange,
  selectedDepartment,
  onDepartmentChange,
  departments,
  datasetSource,
  userRole,
  assignedClassInfo,
}) => {
  const [academicRiskFilter, setAcademicRiskFilter] = useState<string>('ALL');
  const [placementRiskFilter, setPlacementRiskFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('studentId');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination state (default: 25 per page for high performance with 100, 500, 1000+ students)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(25);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'name' || field === 'studentId' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search
      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.department.toLowerCase().includes(searchQuery.toLowerCase());

      // Department
      const matchesDept = 
        selectedDepartment === 'ALL' || s.department === selectedDepartment;

      // Academic Risk
      const matchesAcademic = 
        academicRiskFilter === 'ALL' || s.academicRisk === academicRiskFilter;

      // Placement Risk
      const matchesPlacement = 
        placementRiskFilter === 'ALL' || s.placementRisk === placementRiskFilter;

      return matchesSearch && matchesDept && matchesAcademic && matchesPlacement;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'studentId') {
        comparison = a.studentId.localeCompare(b.studentId);
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'cgpa') {
        comparison = a.cgpa - b.cgpa;
      } else if (sortField === 'attendanceRate') {
        comparison = a.attendanceRate - b.attendanceRate;
      } else if (sortField === 'successScore') {
        const scoreA = a.successScore !== null ? a.successScore : -1;
        const scoreB = b.successScore !== null ? b.successScore : -1;
        comparison = scoreA - scoreB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [students, searchQuery, selectedDepartment, academicRiskFilter, placementRiskFilter, sortField, sortOrder]);

  // Reset pagination to page 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDepartment, academicRiskFilter, placementRiskFilter]);

  const totalFiltered = filteredStudents.length;
  const effectivePageSize = pageSize === 'ALL' ? totalFiltered : pageSize;
  const totalPages = pageSize === 'ALL' || totalFiltered === 0 ? 1 : Math.ceil(totalFiltered / effectivePageSize);
  const activePage = Math.min(Math.max(currentPage, 1), totalPages);

  const displayedStudents = useMemo(() => {
    if (pageSize === 'ALL') return filteredStudents;
    const startIndex = (activePage - 1) * effectivePageSize;
    return filteredStudents.slice(startIndex, startIndex + effectivePageSize);
  }, [filteredStudents, pageSize, activePage, effectivePageSize]);

  const handleResetFilters = () => {
    onSearchChange('');
    onDepartmentChange('ALL');
    setAcademicRiskFilter('ALL');
    setPlacementRiskFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters = 
    searchQuery !== '' || 
    selectedDepartment !== 'ALL' || 
    academicRiskFilter !== 'ALL' || 
    placementRiskFilter !== 'ALL';

  return (
    <div className="space-y-5">
      {/* Teacher Scoped Class Section Banner */}
      {userRole === 'teacher' && assignedClassInfo && (
        <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white font-mono font-bold text-xs shadow-xs">
              {assignedClassInfo.code}
            </div>
            <div>
              <div className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                <span>{assignedClassInfo.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200/60 text-emerald-800">
                  Sec {assignedClassInfo.section}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700/90 mt-0.5">
                {assignedClassInfo.department} • Semester {assignedClassInfo.semester} • <strong>{assignedClassInfo.studentCount} Assigned Students</strong>
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 text-[11px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Teacher Scoped Cohort
          </span>
        </div>
      )}

      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by student name, ID or department..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Filter Selects */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDepartment}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={academicRiskFilter}
              onChange={(e) => setAcademicRiskFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Academic Risk: All</option>
              <option value="High">Academic: High</option>
              <option value="Medium">Academic: Medium</option>
              <option value="Low">Academic: Low</option>
              <option value="Unknown">Academic: Unknown</option>
            </select>

            <select
              value={placementRiskFilter}
              onChange={(e) => setPlacementRiskFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Placement Risk: All</option>
              <option value="High">Placement: High</option>
              <option value="Medium">Placement: Medium</option>
              <option value="Low">Placement: Low</option>
              <option value="Unknown">Placement: Unknown</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors"
                title="Reset all active filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Showing <strong className="text-slate-800">{filteredStudents.length}</strong> of{' '}
              <strong className="text-slate-800">{students.length}</strong> active records ({datasetSource})
            </span>
          </div>
          {datasetSource === 'Synthetic Demo' ? (
            <SyntheticBadge size="sm" />
          ) : (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Active CSV Import
            </span>
          )}
        </div>
      </div>

      {/* Table or Empty State */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          title="No students match the selected criteria"
          description={`Your query "${searchQuery}" or selected department/risk filter yielded 0 results.`}
          actionText="Clear All Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100 select-none">
                <tr>
                  <th 
                    className="px-5 py-3.5 cursor-pointer hover:text-slate-800"
                    onClick={() => handleSort('studentId')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Student ID</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="px-5 py-3.5 cursor-pointer hover:text-slate-800"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Student Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-5 py-3.5">Department</th>
                  <th 
                    className="px-5 py-3.5 text-center cursor-pointer hover:text-slate-800"
                    onClick={() => handleSort('cgpa')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>CGPA</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="px-5 py-3.5 text-center cursor-pointer hover:text-slate-800"
                    onClick={() => handleSort('attendanceRate')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Attendance</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-center">Academic Risk</th>
                  <th className="px-5 py-3.5 text-center">Placement Risk</th>
                  <th 
                    className="px-5 py-3.5 text-center cursor-pointer hover:text-slate-800"
                    onClick={() => handleSort('successScore')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Success Score</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-center">Dataset Source</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {displayedStudents.map((student) => (
                  <tr 
                    key={student.studentId}
                    onClick={() => onSelectStudent(student)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    {/* Consistent studentId */}
                    <td className="px-5 py-3.5 font-mono font-bold text-indigo-600">
                      {student.studentId}
                    </td>

                    {/* Student Name */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{student.name}</div>
                      <div className="text-[11px] text-slate-400">{student.email}</div>
                    </td>

                    {/* Department & Semester */}
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>{student.department}</div>
                      <div className="text-[11px] text-slate-400">Sem {student.semester}</div>
                    </td>

                    {/* CGPA */}
                    <td className="px-5 py-3.5 text-center font-bold text-slate-800">
                      {student.cgpa.toFixed(2)}
                    </td>

                    {/* Attendance */}
                    <td className="px-5 py-3.5 text-center font-semibold">
                      <span className={student.attendanceRate < 75 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                        {student.attendanceRate}%
                      </span>
                    </td>

                    {/* Academic Risk */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                        student.academicRisk === 'High' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : student.academicRisk === 'Medium' 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : student.academicRisk === 'Low'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {student.academicRisk}
                      </span>
                    </td>

                    {/* Placement Risk */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                        student.placementRisk === 'High' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : student.placementRisk === 'Medium' 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : student.placementRisk === 'Low'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {student.placementRisk}
                      </span>
                    </td>

                    {/* Success Score */}
                    <td className="px-5 py-3.5 text-center font-bold text-slate-900">
                      {student.successScore !== null ? (
                        <>
                          {student.successScore} <span className="text-[10px] text-slate-400 font-normal">/ 100</span>
                        </>
                      ) : (
                        <span className="text-amber-600 font-medium text-[11px]">N/A (Incomplete)</span>
                      )}
                    </td>

                    {/* Synthetic vs CSV Label */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        student.isSynthetic 
                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {student.isSynthetic ? 'Synthetic' : 'Imported CSV'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(student);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        <span>Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>
                Showing <strong className="text-slate-800">{totalFiltered === 0 ? 0 : (activePage - 1) * effectivePageSize + 1}–{Math.min(activePage * effectivePageSize, totalFiltered)}</strong> of{' '}
                <strong className="text-slate-800">{totalFiltered}</strong> filtered records ({students.length} total active cohort)
              </span>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={activePage === 1}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <span className="px-2 py-1 text-xs text-slate-600 font-medium">
                  Page <strong className="text-slate-900">{activePage}</strong> of <strong className="text-slate-900">{totalPages}</strong>
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={activePage === totalPages}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="ALL">All ({totalFiltered})</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
