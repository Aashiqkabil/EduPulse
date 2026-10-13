import React from 'react';
import { 
  Users, 
  Award, 
  AlertTriangle, 
  Briefcase, 
  ArrowRight, 
  ChevronRight,
  TrendingUp,
  Info,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Student, NavTab } from '../../types/student';
import { KpiCard } from '../common/KpiCard';
import { SyntheticBadge } from '../common/SyntheticBadge';
import { EmptyState } from '../common/EmptyState';
import { SCORING_DISCLAIMER } from '../../utils/scoringEngine';

interface OverviewTabProps {
  students: Student[];
  onNavigateTab: (tab: NavTab) => void;
  onSelectStudent: (student: Student) => void;
  datasetSource: string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  students,
  onNavigateTab,
  onSelectStudent,
  datasetSource,
}) => {
  const totalStudents = students.length;

  if (totalStudents === 0) {
    return (
      <EmptyState
        title="No student records loaded"
        description="The active dataset is currently empty. You can restore the synthetic demo dataset or upload a verified student CSV file in the Data Import tab."
        actionText="Go to Data Import"
        onAction={() => onNavigateTab('data-import')}
      />
    );
  }

  // Calculate dynamic KPIs from dataset
  const scoredStudents = students.filter(s => typeof s.successScore === 'number' && !isNaN(s.successScore));
  const avgSuccessScore = scoredStudents.length > 0 
    ? (scoredStudents.reduce((acc, s) => acc + s.successScore!, 0) / scoredStudents.length).toFixed(1)
    : 'N/A';

  const academicHighCount = students.filter(s => s.academicRisk === 'High').length;
  const academicMedCount = students.filter(s => s.academicRisk === 'Medium').length;
  const academicUnknownCount = students.filter(s => s.academicRisk === 'Unknown').length;
  
  const placementHighCount = students.filter(s => s.placementRisk === 'High').length;
  const placementMedCount = students.filter(s => s.placementRisk === 'Medium').length;
  const placementUnknownCount = students.filter(s => s.placementRisk === 'Unknown').length;

  // Department Aggregates for Chart
  const deptDataMap: Record<string, { count: number; totalCgpa: number; totalScore: number; scoredCount: number }> = {};
  students.forEach((s) => {
    if (!deptDataMap[s.department]) {
      deptDataMap[s.department] = { count: 0, totalCgpa: 0, totalScore: 0, scoredCount: 0 };
    }
    deptDataMap[s.department].count += 1;
    deptDataMap[s.department].totalCgpa += s.cgpa;
    if (typeof s.successScore === 'number') {
      deptDataMap[s.department].totalScore += s.successScore;
      deptDataMap[s.department].scoredCount += 1;
    }
  });

  const departmentChartData = Object.keys(deptDataMap).map((dept) => {
    const item = deptDataMap[dept];
    return {
      department: dept.length > 15 ? dept.split(' ')[0] + '...' : dept,
      fullDepartment: dept,
      studentsCount: item.count,
      avgCgpa: Number((item.totalCgpa / item.count).toFixed(2)),
      avgSuccessScore: item.scoredCount > 0 ? Number((item.totalScore / item.scoredCount).toFixed(1)) : 0,
    };
  });

  // Risk Distribution Data for Pie Chart
  const riskCounts = [
    { name: 'Low Risk', value: students.filter(s => s.academicRisk === 'Low').length, color: '#10b981' },
    { name: 'Medium Risk', value: academicMedCount, color: '#f59e0b' },
    { name: 'High Risk', value: academicHighCount, color: '#ef4444' },
  ];
  if (academicUnknownCount > 0) {
    riskCounts.push({ name: 'Unknown / Incomplete', value: academicUnknownCount, color: '#94a3b8' });
  }

  // Priority attention students (High academic or placement risk)
  const allPriorityStudents = students.filter(s => s.academicRisk === 'High' || s.placementRisk === 'High');
  const totalPriorityCount = allPriorityStudents.length;
  const priorityStudents = allPriorityStudents.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Dataset & Scoring Notice */}
      <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800 flex-shrink-0 mt-0.5 sm:mt-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Active Source: {datasetSource}
              </h2>
              {datasetSource === 'Synthetic Demo' ? (
                <SyntheticBadge size="sm" />
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Verified CSV Import
                </span>
              )}
            </div>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              {SCORING_DISCLAIMER}
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigateTab('data-import')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
          <span>Manage Data</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Students"
          value={totalStudents}
          subValue={`/ 100 capacity (${Math.max(0, 100 - totalStudents)} free slots)`}
          icon={<Users className="w-5 h-5" />}
          variant="indigo"
          changeText={`${totalStudents}/100 Slots`}
          changeType="neutral"
          note={`Across ${Object.keys(deptDataMap).length} Depts • Space for 100`}
        />

        <KpiCard
          title="Average Success Score"
          value={avgSuccessScore}
          subValue="/ 100"
          icon={<Award className="w-5 h-5" />}
          variant="blue"
          changeText="Weighted Prototype"
          changeType="positive"
          note="Norm Scale (0-100)"
        />

        <KpiCard
          title="Academic Risk"
          value={academicHighCount}
          subValue={academicUnknownCount > 0 ? `+ ${academicMedCount} Med (${academicUnknownCount} Unk)` : `+ ${academicMedCount} Med`}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant="rose"
          changeText={`${academicHighCount} High Risk`}
          changeType="negative"
          note="CGPA < 5.0 or Att < 60%"
        />

        <KpiCard
          title="Placement Risk"
          value={placementHighCount}
          subValue={placementUnknownCount > 0 ? `+ ${placementMedCount} Med (${placementUnknownCount} Unk)` : `+ ${placementMedCount} Med`}
          icon={<Briefcase className="w-5 h-5" />}
          variant="amber"
          changeText={`${placementHighCount} High Risk`}
          changeType="warning"
          note="Readiness < 40 or Skill < 40%"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Department Performance */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Departmental Average Performance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated weighted Success Score (0-100) and average CGPA by department
              </p>
            </div>
            <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
              {datasetSource}
            </span>
          </div>

          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="department" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-slate-100">{data.fullDepartment}</p>
                          <p className="text-slate-300">Cohort Size: <span className="font-semibold text-white">{data.studentsCount}</span></p>
                          <p className="text-indigo-300">Avg Success Score: <span className="font-semibold text-white">{data.avgSuccessScore} / 100</span></p>
                          <p className="text-blue-300">Avg CGPA: <span className="font-semibold text-white">{data.avgCgpa} / 10.0</span></p>
                          <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800">
                            Source: {datasetSource}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                  formatter={(value) => <span className="text-slate-600 font-medium">{value}</span>}
                />
                <Bar 
                  dataKey="avgSuccessScore" 
                  name="Avg Success Score" 
                  fill="#4f46e5" 
                  radius={[6, 6, 0, 0]} 
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Risk Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Academic Risk Breakdown</h2>
              <p className="text-xs text-slate-500 mt-0.5">Distribution across deterministic risk tiers</p>
            </div>

            <div className="h-56 mt-2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskCounts}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {riskCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number, name: string) => [
                      `${val} Students (${((val / totalStudents) * 100).toFixed(0)}%)`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-900">{totalStudents}</span>
                <span className="text-[11px] text-slate-400 font-medium">Students</span>
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {riskCounts.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <div className="font-semibold text-slate-900">
                    {item.value} <span className="text-slate-400 font-normal">({((item.value / totalStudents) * 100).toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            Reflecting active {datasetSource} cohort
          </div>
        </div>
      </div>

      {/* Priority Attention Student List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Priority Attention Students</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                Action Recommended
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              High academic or placement risk students requiring mentor intervention
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('students')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span>View all {totalStudents} students</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {priorityStudents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No high risk students in this cohort!</p>
            <p className="text-slate-400 mt-0.5">All active students satisfy standard academic and placement criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Student ID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3 text-center">CGPA</th>
                  <th className="px-5 py-3 text-center">Attendance</th>
                  <th className="px-5 py-3 text-center">Academic Risk</th>
                  <th className="px-5 py-3 text-center">Placement Risk</th>
                  <th className="px-5 py-3 text-center">Success Score</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {priorityStudents.map((student) => (
                  <tr 
                    key={student.studentId}
                    onClick={() => onSelectStudent(student)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono font-medium text-indigo-600">
                      {student.studentId}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {student.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {student.department}
                    </td>
                    <td className="px-5 py-3 text-center font-medium">
                      {student.cgpa.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-center font-medium">
                      <span className={student.attendanceRate < 75 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                        {student.attendanceRate}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
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
                    <td className="px-5 py-3 text-center">
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
                    <td className="px-5 py-3 text-center font-bold text-slate-900">
                      {student.successScore !== null ? student.successScore : 'N/A'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(student);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Top {priorityStudents.length} priority interventions shown ({totalPriorityCount} total high-risk identified)</span>
          </div>
          <button
            onClick={() => onNavigateTab('students')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Open Full Directory <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
