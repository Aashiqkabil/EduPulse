import React from 'react';
import { 
  GraduationCap, 
  Award, 
  Sparkles, 
  Clock, 
  Briefcase, 
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Student } from '../../types/student';
import { KpiCard } from '../common/KpiCard';

interface StudentPortalTabProps {
  student: Student;
}

export const StudentPortalTab: React.FC<StudentPortalTabProps> = ({ student }) => {
  const breakdown = student.scoreBreakdown;

  // Generate personalized explainable AI improvement advice
  const recommendations: Array<{ priority: 'High' | 'Medium' | 'Low'; area: string; action: string }> = [];
  if (student.attendanceRate < 75) {
    recommendations.push({
      priority: 'High',
      area: 'Attendance Compliance',
      action: `Your attendance is currently ${student.attendanceRate}%. Attending the next 12 consecutive lectures will lift your attendance rate back above institutional eligibility thresholds (75%).`,
    });
  }
  if (student.assignmentScore < 70) {
    recommendations.push({
      priority: 'Medium',
      area: 'Continuous Assessment',
      action: `Assignment completion is at ${student.assignmentScore}%. Review upcoming weekly LMS modules and submit lab assignments on schedule to raise continuous evaluation scores.`,
    });
  }
  if (student.technicalSkillsRating < 3.5) {
    recommendations.push({
      priority: 'Medium',
      area: 'Technical Skill Portfolio',
      action: `Technical skills rating is ${student.technicalSkillsRating}/5.0. Participate in campus hackathons or enroll in advanced cloud/data engineering certification electives.`,
    });
  }
  if (!student.internshipCompleted) {
    recommendations.push({
      priority: 'High',
      area: 'Industry Readiness',
      action: 'Internship requirement is not yet logged. Schedule an appointment with the Department Placement Cell to explore summer internships.',
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'Low',
      area: 'Excellence & Mentorship',
      action: 'Outstanding performance across all core metrics. Maintain consistency and consider acting as a peer mentor for junior cohort seminars.',
    });
  }

  return (
    <div className="space-y-6">
      
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300 border border-white/10 shadow-inner">
            <GraduationCap className="w-9 h-9" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-extrabold tracking-tight">{student.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                {student.studentId}
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-1 flex flex-wrap items-center gap-2">
              <span>{student.department}</span>
              <span>•</span>
              <span>Semester {student.semester}</span>
              <span>•</span>
              <span>Email: {student.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/10 text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Academic Standing</div>
            <div className="text-sm font-bold text-white mt-0.5 flex items-center justify-end gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${student.academicRisk === 'Low' ? 'bg-emerald-400' : student.academicRisk === 'Medium' ? 'bg-amber-400' : 'bg-rose-400'}`} />
              <span>{student.academicRisk} Risk Tier</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Overall Success Score"
          value={student.successScore !== null ? `${student.successScore}` : 'N/A'}
          subValue="/ 100"
          icon={<Activity className="w-5 h-5" />}
          variant={student.academicRisk === 'Low' ? 'emerald' : student.academicRisk === 'Medium' ? 'amber' : 'rose'}
          changeText="Weighted Heuristic"
          changeType={student.academicRisk === 'Low' ? 'positive' : 'warning'}
          note="Prototype Algorithm"
        />
        <KpiCard
          title="Cumulative CGPA"
          value={`${student.cgpa.toFixed(2)}`}
          subValue="/ 10.0"
          icon={<Award className="w-5 h-5" />}
          variant={student.cgpa >= 8.0 ? 'emerald' : student.cgpa >= 6.5 ? 'blue' : 'amber'}
          changeText="Academic Standard"
          changeType="neutral"
          note="Normalized: 35% weight"
        />
        <KpiCard
          title="Lecture Attendance"
          value={`${student.attendanceRate.toFixed(1)}%`}
          subValue={student.attendanceRate >= 75 ? 'Above 75%' : 'Below 75%'}
          icon={<Clock className="w-5 h-5" />}
          variant={student.attendanceRate >= 75 ? 'emerald' : 'rose'}
          changeText={student.attendanceRate >= 75 ? 'Eligible' : 'Critical Warning'}
          changeType={student.attendanceRate >= 75 ? 'positive' : 'negative'}
          note="20% Success Weight"
        />
        <KpiCard
          title="Placement Readiness"
          value={`${student.placementReadinessScore.toFixed(0)}%`}
          subValue={`Skill: ${student.technicalSkillsRating} / 5`}
          icon={<Briefcase className="w-5 h-5" />}
          variant={student.placementReadinessScore >= 70 ? 'indigo' : 'amber'}
          changeText={student.internshipCompleted ? 'Internship Done' : 'Internship Pending'}
          changeType={student.internshipCompleted ? 'positive' : 'warning'}
          note="Career Readiness Index"
        />
      </div>

      {/* Transparent Component Weight Breakdown */}
      {breakdown && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Explainable Performance Factor Weights</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Transparent mathematical breakdown showing the exact contribution of each factor to your Success Score.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
              Total: {student.successScore} / 100
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Academic CGPA (35%)</span>
                <span className="font-mono text-indigo-700">+{breakdown.academicComponent} pts</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(breakdown.academicComponent / 35) * 100}%` }} />
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5">Normalized: {breakdown.cgpaNormalized}%</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Lecture Attendance (20%)</span>
                <span className="font-mono text-indigo-700">+{breakdown.attendanceComponent} pts</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(breakdown.attendanceComponent / 20) * 100}%` }} />
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5">Normalized: {breakdown.attendanceNormalized}%</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>LMS Coursework (15%)</span>
                <span className="font-mono text-indigo-700">+{breakdown.lmsComponent} pts</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(breakdown.lmsComponent / 15) * 100}%` }} />
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5">Normalized: {breakdown.lmsNormalized}%</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Student Engagement (10%)</span>
                <span className="font-mono text-indigo-700">+{breakdown.engagementComponent} pts</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(breakdown.engagementComponent / 10) * 100}%` }} />
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5">Normalized: {breakdown.engagementNormalized}%</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Technical Skill Rating (10%)</span>
                <span className="font-mono text-indigo-700">+{breakdown.skillsComponent} pts</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(breakdown.skillsComponent / 10) * 100}%` }} />
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5">Normalized: {breakdown.skillsNormalized}%</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Placement Readiness (10%)</span>
                <span className="font-mono text-indigo-700">+{breakdown.placementComponent} pts</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(breakdown.placementComponent / 10) * 100}%` }} />
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5">Normalized: {breakdown.placementNormalized}%</div>
            </div>
          </div>
        </div>
      )}

      {/* AI Next Actions & Personalized Recommendations */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">Personalized Intervention & Action Items</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Data-driven proactive guidance designed to optimize your academic trajectory before mid-semester evaluations.
        </p>

        <div className="space-y-3">
          {recommendations.map((rec, idx) => (
            <div 
              key={idx}
              className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                rec.priority === 'High' 
                  ? 'bg-rose-50/40 border-rose-200/70' 
                  : rec.priority === 'Medium'
                  ? 'bg-amber-50/40 border-amber-200/70'
                  : 'bg-emerald-50/40 border-emerald-200/70'
              }`}
            >
              <div className="mt-0.5">
                {rec.priority === 'High' ? (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                    rec.priority === 'High' ? 'bg-rose-100 text-rose-800' : rec.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {rec.priority} Priority
                  </span>
                  <span className="text-xs font-bold text-slate-800">{rec.area}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{rec.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
