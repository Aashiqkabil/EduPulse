import React from 'react';
import { 
  X, 
  GraduationCap, 
  AlertTriangle, 
  Briefcase, 
  BookOpen, 
  CheckCircle, 
  Mail, 
  Award,
  ShieldAlert,
  MessageSquare,
  Activity,
  Layers
} from 'lucide-react';
import { Student } from '../../types/student';
import { SyntheticBadge } from '../common/SyntheticBadge';
// Scoring engine utilities available for future use

interface StudentDetailModalProps {
  student: Student | null;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose }) => {
  if (!student) return null;

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'High':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Low':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const breakdown = student.scoreBreakdown;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 border border-white/10">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{student.name}</h3>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-white/20 text-white">
                  {student.studentId}
                </span>
              </div>
              <p className="text-xs text-indigo-200 flex items-center gap-2 mt-0.5">
                <span>{student.department}</span>
                <span>•</span>
                <span>Semester {student.semester}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Dataset Status Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {student.isSynthetic ? (
                <SyntheticBadge size="sm" />
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Imported CSV Cohort
                </span>
              )}
              <span className="text-[11px] text-slate-500">
                Record verified • Synced {student.lastUpdated}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">ID: {student.studentId}</span>
          </div>

          {/* Insufficient Data Warning (if applicable) */}
          {student.hasInsufficientData && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Incomplete Student Record:</strong>
                <p className="mt-0.5">
                  Success Score could not be computed due to missing attributes: {student.incompleteReasons?.join(', ')}.
                </p>
              </div>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">CGPA</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{student.cgpa.toFixed(2)}</p>
              <span className="text-[11px] text-slate-400">Scale of 10.0</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Attendance</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{student.attendanceRate}%</p>
              <span className="text-[11px] text-slate-400">Class threshold 75%</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">LMS Assignment</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{student.assignmentScore}%</p>
              <span className="text-[11px] text-slate-400">LMS completion</span>
            </div>
            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100">
              <span className="text-xs text-indigo-700 font-medium">Success Score</span>
              <p className="text-xl font-bold text-indigo-950 mt-1">
                {student.successScore !== null ? student.successScore : 'N/A'}{' '}
                <span className="text-xs font-normal text-indigo-600">/ 100</span>
              </p>
              <span className="text-[11px] text-indigo-500">Weighted metric</span>
            </div>
          </div>

          {/* Transparent Score Breakdown Section */}
          {breakdown && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Explainable Success Score Breakdown
                </span>
                <span className="text-xs font-bold text-indigo-700">
                  Total: {student.successScore} / 100
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Academic (35%)</span>
                    <strong className="text-indigo-600">+{breakdown.academicComponent}</strong>
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    CGPA {student.cgpa} ({breakdown.cgpaNormalized}%)
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Attendance (20%)</span>
                    <strong className="text-indigo-600">+{breakdown.attendanceComponent}</strong>
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {student.attendanceRate}% Attendance
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>LMS Completion (15%)</span>
                    <strong className="text-indigo-600">+{breakdown.lmsComponent}</strong>
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {student.assignmentScore}% Completed
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Engagement (10%)</span>
                    <strong className="text-indigo-600">+{breakdown.engagementComponent}</strong>
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {student.engagementScore}% Active
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Skills Rating (10%)</span>
                    <strong className="text-indigo-600">+{breakdown.skillsComponent}</strong>
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {student.technicalSkillsRating}/5 ({breakdown.skillsNormalized}%)
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Placement (10%)</span>
                    <strong className="text-indigo-600">+{breakdown.placementComponent}</strong>
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {student.placementReadinessScore}% Readiness
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Risk Evaluation Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  Academic Risk
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRiskBadge(student.academicRisk)}`}>
                  {student.academicRisk} Risk
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {student.academicRisk === 'High' 
                  ? 'CGPA is below 5.0 or Attendance is below 60%. Early academic mentoring intervention recommended.'
                  : student.academicRisk === 'Medium'
                  ? 'CGPA is below 6.5 or Attendance is below 75%. Monitor upcoming assessments.'
                  : student.academicRisk === 'Low'
                  ? 'Consistent academic performance with attendance above 75% and CGPA above 6.5.'
                  : 'Insufficient data to compute academic risk.'}
              </p>
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                <span>Active backlogs: <strong className="text-slate-800">{student.backlogs}</strong></span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  Placement Risk
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRiskBadge(student.placementRisk)}`}>
                  {student.placementRisk} Risk
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {student.placementRisk === 'High'
                  ? 'Placement readiness score is below 40% or Technical skill rating is below 2.0/5.0.'
                  : student.placementRisk === 'Medium'
                  ? 'Placement readiness is below 60% or Technical skill rating is below 3.0/5.0.'
                  : student.placementRisk === 'Low'
                  ? 'Strong candidate profile with high technical rating and placement readiness.'
                  : 'Insufficient data to compute placement risk.'}
              </p>
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
                <CheckCircle className={`w-3.5 h-3.5 ${student.internshipCompleted ? 'text-emerald-500' : 'text-slate-300'}`} />
                <span>Internship completed: <strong className="text-slate-800">{student.internshipCompleted ? 'Yes' : 'No'}</strong></span>
              </div>
            </div>
          </div>

          {/* Qualitative Feedback (if present) */}
          {student.feedback && (
            <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
              <MessageSquare className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-indigo-950">Faculty / Mentor Notes:</strong>
                <p className="mt-0.5 text-indigo-800 leading-relaxed">{student.feedback}</p>
              </div>
            </div>
          )}

          {/* Details Metadata */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{student.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              <span>Skill Rating: <strong>{student.technicalSkillsRating} / 5.0</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <span>Readiness: <strong>{student.placementReadinessScore}%</strong></span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 max-w-sm">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span className="truncate">Illustrative prototype weights • Non-clinical</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
