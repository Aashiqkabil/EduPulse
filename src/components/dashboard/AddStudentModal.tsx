import React, { useState, useMemo } from 'react';
import { X, UserPlus, Database, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Student } from '../../types/student';
import { calculateStudentSuccessScore } from '../../utils/scoringEngine';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveStudent: (student: Student, saveToDb: boolean) => Promise<{ success: boolean; error?: string | null }>;
  departments: string[];
  isSupabaseConnected: boolean;
  isDemoMode?: boolean;
  isVerifiedAdmin?: boolean;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onSaveStudent,
  departments,
  isSupabaseConnected,
  isDemoMode = false,
  isVerifiedAdmin = false,
}) => {
  const availableDepts = useMemo(() => {
    const list = departments.filter((d) => d !== 'ALL');
    return list.length > 0 ? list : ['Computer Science', 'Information Technology', 'Data Science', 'Electronics'];
  }, [departments]);

  const [studentId, setStudentId] = useState(`STU-2024-${Math.floor(1000 + Math.random() * 9000)}`);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState(availableDepts[0]);
  const [semester, setSemester] = useState(4);
  const [cgpa, setCgpa] = useState(8.2);
  const [attendanceRate, setAttendanceRate] = useState(88);
  const [assignmentScore, setAssignmentScore] = useState(85);
  const [engagementScore, setEngagementScore] = useState(80);
  const [technicalSkillsRating, setTechnicalSkillsRating] = useState(4.0);
  const [placementReadinessScore, setPlacementReadinessScore] = useState(82);
  const [internshipCompleted, setInternshipCompleted] = useState(false);
  const [backlogs, setBacklogs] = useState(0);
  const [feedback, setFeedback] = useState('Active participant in technical workshops.');
  const [saveToSupabase, setSaveToSupabase] = useState(Boolean(isSupabaseConnected && !isDemoMode && isVerifiedAdmin));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);


  // Live calculation of Success Score and Risk metrics
  const liveScore = useMemo(() => {
    return calculateStudentSuccessScore({
      cgpa: Number(cgpa),
      attendanceRate: Number(attendanceRate),
      assignmentScore: Number(assignmentScore),
      engagementScore: Number(engagementScore),
      technicalSkillsRating: Number(technicalSkillsRating),
      placementReadinessScore: Number(placementReadinessScore),
    });
  }, [cgpa, attendanceRate, assignmentScore, engagementScore, technicalSkillsRating, placementReadinessScore]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessNotice(null);

    // Validation checks
    if (!studentId.trim()) {
      setFormError('Student ID is required.');
      return;
    }
    if (!name.trim()) {
      setFormError('Student full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('A valid email address is required.');
      return;
    }
    if (cgpa < 0 || cgpa > 10) {
      setFormError('CGPA must be between 0.0 and 10.0.');
      return;
    }
    if (attendanceRate < 0 || attendanceRate > 100) {
      setFormError('Attendance rate must be between 0% and 100%.');
      return;
    }
    if (assignmentScore < 0 || assignmentScore > 100) {
      setFormError('Assignment score must be between 0% and 100%.');
      return;
    }
    if (engagementScore < 0 || engagementScore > 100) {
      setFormError('Engagement score must be between 0% and 100%.');
      return;
    }
    if (technicalSkillsRating < 1 || technicalSkillsRating > 5) {
      setFormError('Technical skills rating must be between 1.0 and 5.0.');
      return;
    }
    if (placementReadinessScore < 0 || placementReadinessScore > 100) {
      setFormError('Placement readiness must be between 0% and 100%.');
      return;
    }

    const newStudent: Student = {
      studentId: studentId.trim(),
      name: name.trim(),
      email: email.trim(),
      department,
      semester: Number(semester),
      cgpa: Number(cgpa),
      attendanceRate: Number(attendanceRate),
      assignmentScore: Number(assignmentScore),
      engagementScore: Number(engagementScore),
      technicalSkillsRating: Number(technicalSkillsRating),
      placementReadinessScore: Number(placementReadinessScore),
      internshipCompleted,
      backlogs: Number(backlogs),
      feedback: feedback.trim() || undefined,
      successScore: liveScore.successScore,
      academicRisk: liveScore.academicRisk,
      placementRisk: liveScore.placementRisk,
      scoreBreakdown: liveScore.scoreBreakdown,
      hasInsufficientData: liveScore.hasInsufficientData,
      incompleteReasons: liveScore.incompleteReasons,
      isSynthetic: !saveToSupabase,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    setIsSubmitting(true);
    const result = await onSaveStudent(newStudent, saveToSupabase);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessNotice(`Student ${newStudent.studentId} successfully saved ${saveToSupabase ? 'to Supabase DB' : 'to active session'}!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setFormError(result.error || 'Failed to save student record.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Authorized Student Record</h2>
              <p className="text-xs text-slate-500">Insert verified student into academic database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Risk & Score Calculation Preview Banner */}
        <div className="px-6 py-3 bg-gradient-to-r from-indigo-50/80 to-blue-50/50 border-b border-indigo-100/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-indigo-950">Calculated Success Score:</span>
            <span className="text-base font-extrabold text-indigo-600">{liveScore.successScore ?? 'N/A'}%</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium">Academic Risk:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                liveScore.academicRisk === 'High' ? 'bg-rose-100 text-rose-800' :
                liveScore.academicRisk === 'Medium' ? 'bg-amber-100 text-amber-800' :
                'bg-emerald-100 text-emerald-800'
              }`}>
                {liveScore.academicRisk}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium">Placement Risk:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                liveScore.placementRisk === 'High' ? 'bg-rose-100 text-rose-800' :
                liveScore.placementRisk === 'Medium' ? 'bg-amber-100 text-amber-800' :
                'bg-emerald-100 text-emerald-800'
              }`}>
                {liveScore.placementRisk}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Notifications */}
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Validation or Database Error:</strong>
                <p className="mt-0.5 text-rose-800">{formError}</p>
              </div>
            </div>
          )}

          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold">{successNotice}</span>
            </div>
          )}

          {/* Row 1: ID, Name, Email */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Student ID *
              </label>
              <input
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ananya Sen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                College Email *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. ananya.s@campus.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Row 2: Department, Semester, Backlogs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500"
              >
                {availableDepts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Semester (1-8)
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Active Backlogs
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={backlogs}
                onChange={(e) => setBacklogs(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row 3: Academic Performance (CGPA, Attendance, Assignment LMS) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                CGPA (0.00 – 10.00)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={cgpa}
                onChange={(e) => setCgpa(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Attendance Rate (0–100%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={attendanceRate}
                onChange={(e) => setAttendanceRate(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                LMS Assignment (0–100%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={assignmentScore}
                onChange={(e) => setAssignmentScore(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row 4: Professional & Engagement (Skill, Readiness, Engagement) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Skill Rating (1.0 – 5.0)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={technicalSkillsRating}
                onChange={(e) => setTechnicalSkillsRating(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Placement Readiness (0–100%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={placementReadinessScore}
                onChange={(e) => setPlacementReadinessScore(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Engagement (0–100%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={engagementScore}
                onChange={(e) => setEngagementScore(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row 5: Internship Checkbox & Qualitative Feedback */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={internshipCompleted}
                onChange={(e) => setInternshipCompleted(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-700">Internship Completed</span>
            </label>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Faculty Notes / Qualitative Feedback
              </label>
              <input
                type="text"
                placeholder="Optional mentor observations..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Database Target Selector */}
          <div className="pt-2">
            {isDemoMode ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Offline Demo Mode (Database Writes Disabled)</span>
                  <span className="text-[11px] text-amber-800">
                    You are in Reviewer Demo Mode. This student record will be added to temporary local session memory only. Sign in with verified administrator credentials to persist to live Supabase.
                  </span>
                </div>
              </div>
            ) : !isVerifiedAdmin ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Administrator Authorization Required</span>
                  <span className="text-[11px] text-rose-800">
                    Only verified institutional administrators can persist student records to the remote database.
                  </span>
                </div>
              </div>
            ) : (
              <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-colors cursor-pointer ${
                saveToSupabase
                  ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={saveToSupabase}
                  onChange={(e) => setSaveToSupabase(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-600" />
                    Persist to Supabase Database (public.students)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {isSupabaseConnected
                      ? 'Row will be inserted directly into remote PostgreSQL table and verified on page reload.'
                      : 'Supabase offline: will save to active session cohort.'}
                  </span>
                </div>
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Record...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{saveToSupabase ? 'Insert to Supabase DB' : 'Add to Session Cohort'}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
