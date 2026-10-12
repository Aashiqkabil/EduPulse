import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  LineChart,
  Line
} from 'recharts';
import { 
  Activity, 
  Info, 
  TrendingUp, 
  AlertCircle
} from 'lucide-react';
import { Student } from '../../types/student';
import { SyntheticBadge } from '../common/SyntheticBadge';
import { EmptyState } from '../common/EmptyState';
import { SCORING_DISCLAIMER } from '../../utils/scoringEngine';

interface AnalyticsTabProps {
  students: Student[];
  datasetSource: string;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ students, datasetSource }) => {
  if (students.length === 0) {
    return (
      <EmptyState
        title="No student data available for analytics"
        description="The active cohort is empty. Please restore the synthetic demo dataset or import a valid student CSV file."
      />
    );
  }

  // Chart 1: Attendance vs Success Score by Risk Category
  const riskGroups = ['Low', 'Medium', 'High'] as const;
  const riskAnalysisData = riskGroups.map((risk) => {
    const group = students.filter(s => s.academicRisk === risk);
    const count = group.length;
    const avgAttendance = count > 0 
      ? Number((group.reduce((acc, s) => acc + s.attendanceRate, 0) / count).toFixed(1))
      : 0;
    const avgCgpa = count > 0 
      ? Number((group.reduce((acc, s) => acc + s.cgpa, 0) / count).toFixed(2))
      : 0;
    
    const scoredGroup = group.filter(s => typeof s.successScore === 'number');
    const avgScore = scoredGroup.length > 0 
      ? Number((scoredGroup.reduce((acc, s) => acc + s.successScore!, 0) / scoredGroup.length).toFixed(1))
      : 0;

    return {
      riskCategory: `${risk} Risk`,
      studentCount: count,
      avgAttendance,
      actualAvgCgpa: avgCgpa,
      avgScore
    };
  });

  // Chart 2: Skill Rating & Placement Readiness by Department
  const deptList = Array.from(new Set(students.map(s => s.department)));
  const deptReadinessData = deptList.map((dept) => {
    const group = students.filter(s => s.department === dept);
    const count = group.length;
    const avgSkill = count > 0
      ? Number((group.reduce((acc, s) => acc + s.technicalSkillsRating, 0) / count).toFixed(2))
      : 0;
    const avgReadiness = count > 0
      ? Number((group.reduce((acc, s) => acc + s.placementReadinessScore, 0) / count).toFixed(1))
      : 0;
    const internshipCount = group.filter(s => s.internshipCompleted).length;
    const internshipRate = count > 0 ? Number(((internshipCount / count) * 100).toFixed(0)) : 0;

    return {
      department: dept.length > 15 ? dept.split(' ')[0] + '...' : dept,
      fullDept: dept,
      avgSkillScore: Number((avgSkill * 20).toFixed(1)), // 5.0 scaled to 100
      actualSkill: avgSkill,
      internshipRate,
      avgReadiness
    };
  });

  // Risk Cross-Tabulation Matrix
  const riskMatrix = {
    highHigh: students.filter(s => s.academicRisk === 'High' && s.placementRisk === 'High').length,
    highMed: students.filter(s => s.academicRisk === 'High' && s.placementRisk === 'Medium').length,
    highLow: students.filter(s => s.academicRisk === 'High' && s.placementRisk === 'Low').length,
    medHigh: students.filter(s => s.academicRisk === 'Medium' && s.placementRisk === 'High').length,
    medMed: students.filter(s => s.academicRisk === 'Medium' && s.placementRisk === 'Medium').length,
    medLow: students.filter(s => s.academicRisk === 'Medium' && s.placementRisk === 'Low').length,
    lowHigh: students.filter(s => s.academicRisk === 'Low' && s.placementRisk === 'High').length,
    lowMed: students.filter(s => s.academicRisk === 'Low' && s.placementRisk === 'Medium').length,
    lowLow: students.filter(s => s.academicRisk === 'Low' && s.placementRisk === 'Low').length,
  };

  return (
    <div className="space-y-6">
      {/* Scoring Engine Notice */}
      <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800 flex-shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Analytics Engine Context: {datasetSource}
              </h2>
              {datasetSource === 'Synthetic Demo' ? (
                <SyntheticBadge size="sm" />
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active CSV Import
                </span>
              )}
            </div>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              {SCORING_DISCLAIMER}
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Risk Correlation Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Attendance & Success Score by Risk Tier
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Correlating student attendance rates with weighted success scores
            </p>
          </div>

          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskAnalysisData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="riskCategory" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-slate-100">{data.riskCategory}</p>
                          <p className="text-slate-300">Cohort Size: <span className="font-semibold text-white">{data.studentCount} students</span></p>
                          <p className="text-indigo-300">Avg Attendance: <span className="font-semibold text-white">{data.avgAttendance}%</span></p>
                          <p className="text-emerald-300">Avg Success Score: <span className="font-semibold text-white">{data.avgScore} / 100</span></p>
                          <p className="text-blue-300">Avg CGPA: <span className="font-semibold text-white">{data.actualAvgCgpa} / 10.0</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="avgAttendance" name="Avg Attendance %" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={26} />
                <Bar dataKey="avgScore" name="Avg Success Score" fill="#10b981" radius={[6, 6, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Skills & Placement Readiness */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              Technical Skill Rating & Placement Readiness
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Departmental breakdown of placement readiness vs scaled skill score
            </p>
          </div>

          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deptReadinessData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-slate-100">{data.fullDept}</p>
                          <p className="text-indigo-300">Technical Skill: <span className="font-semibold text-white">{data.actualSkill} / 5.0</span></p>
                          <p className="text-emerald-300">Placement Readiness: <span className="font-semibold text-white">{data.avgReadiness}%</span></p>
                          <p className="text-blue-300">Internship Completion: <span className="font-semibold text-white">{data.internshipRate}%</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="avgReadiness" name="Placement Readiness %" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="avgSkillScore" name="Tech Skill Rating (Scaled)" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dual Risk Cross-Tabulation Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Academic Risk × Placement Risk Matrix</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Active student distribution across cross-dimensional deterministic risk tiers
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            Total Cohort: {students.length} Students ({datasetSource})
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-center text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 px-4 text-left font-semibold">Academic \ Placement</th>
                <th className="py-3 px-4 font-semibold text-emerald-700 bg-emerald-50/50">Placement: Low Risk</th>
                <th className="py-3 px-4 font-semibold text-amber-700 bg-amber-50/50">Placement: Med Risk</th>
                <th className="py-3 px-4 font-semibold text-rose-700 bg-rose-50/50">Placement: High Risk</th>
                <th className="py-3 px-4 font-semibold text-slate-700 bg-slate-50">Academic Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3.5 px-4 text-left font-semibold text-emerald-700 bg-emerald-50/30">Academic: Low Risk</td>
                <td className="py-3.5 px-4 font-bold text-slate-800 bg-emerald-50/20">{riskMatrix.lowLow}</td>
                <td className="py-3.5 px-4 font-bold text-slate-800 bg-amber-50/20">{riskMatrix.lowMed}</td>
                <td className="py-3.5 px-4 font-bold text-slate-800 bg-rose-50/20">{riskMatrix.lowHigh}</td>
                <td className="py-3.5 px-4 font-bold text-slate-900 bg-slate-50/50">
                  {riskMatrix.lowLow + riskMatrix.lowMed + riskMatrix.lowHigh}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 text-left font-semibold text-amber-700 bg-amber-50/30">Academic: Med Risk</td>
                <td className="py-3.5 px-4 font-bold text-slate-800 bg-emerald-50/20">{riskMatrix.medLow}</td>
                <td className="py-3.5 px-4 font-bold text-slate-800 bg-amber-50/20">{riskMatrix.medMed}</td>
                <td className="py-3.5 px-4 font-bold text-slate-800 bg-rose-50/20">{riskMatrix.medHigh}</td>
                <td className="py-3.5 px-4 font-bold text-slate-900 bg-slate-50/50">
                  {riskMatrix.medLow + riskMatrix.medMed + riskMatrix.medHigh}
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 text-left font-semibold text-rose-700 bg-rose-50/30">Academic: High Risk</td>
                <td className="py-3.5 px-4 font-bold text-slate-800 bg-emerald-50/20">{riskMatrix.highLow}</td>
                <td className="py-3.5 px-4 font-bold text-slate-800 bg-amber-50/20">{riskMatrix.highMed}</td>
                <td className="py-3.5 px-4 font-bold text-rose-700 bg-rose-100/50">{riskMatrix.highHigh} (Critical)</td>
                <td className="py-3.5 px-4 font-bold text-slate-900 bg-slate-50/50">
                  {riskMatrix.highLow + riskMatrix.highMed + riskMatrix.highHigh}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                <td className="py-3 px-4 text-left">Placement Total</td>
                <td className="py-3 px-4">{riskMatrix.lowLow + riskMatrix.medLow + riskMatrix.highLow}</td>
                <td className="py-3 px-4">{riskMatrix.lowMed + riskMatrix.medMed + riskMatrix.highMed}</td>
                <td className="py-3 px-4">{riskMatrix.lowHigh + riskMatrix.medHigh + riskMatrix.highHigh}</td>
                <td className="py-3 px-4 text-indigo-700">{students.length} Total</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span>
            Students situated in the <strong>High Academic × High Placement</strong> cell ({riskMatrix.highHigh} students) are prioritized for dual intervention: peer-tutoring and placement soft-skill coaching.
          </span>
        </div>
      </div>
    </div>
  );
};
