import React from 'react';
import { 
  ShieldCheck, 
  GraduationCap, 
  BookOpen, 
  CheckCircle, 
  ArrowRight, 
  RotateCcw,
  UserCheck,
  Info
} from 'lucide-react';
import { DemoIdentity } from '../../types/student';
import { DEMO_IDENTITIES } from '../../data/syntheticStudents';

interface DemoUsersTabProps {
  currentIdentityId: string;
  onSelectIdentity: (identity: DemoIdentity) => void;
  onResetDemoData: () => void;
}

export const DemoUsersTab: React.FC<DemoUsersTabProps> = ({
  currentIdentityId,
  onSelectIdentity,
  onResetDemoData,
}) => {
  return (
    <div className="space-y-6">
      
      {/* Banner Notice */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
              Hackathon Demo System
            </span>
            <span className="text-xs text-indigo-300 font-medium">Stage 3 Architecture</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mt-1">Preconfigured Demo Identities</h2>
          <p className="text-xs text-indigo-200/80 mt-1 max-w-2xl leading-relaxed">
            Switch effortlessly between Admin, Faculty Mentor, and Student personas. Each identity operates within its strictly scoped synthetic demo data without altering remote database accounts.
          </p>
        </div>

        <button
          onClick={onResetDemoData}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition-all flex-shrink-0 cursor-pointer shadow-xs"
          title="Reset modified student grades and restore default synthetic benchmark records"
        >
          <RotateCcw className="w-3.5 h-3.5 text-indigo-300" />
          <span>Reset Demo Data</span>
        </button>
      </div>

      {/* Safety Notice Card */}
      <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold">Client-Side Role Sandbox:</strong> Switching identities here alters in-memory presentation and scoped cohort visibility for presentation purposes. Production role changes require authenticated administrator RPC invocation (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">admin_set_user_role_and_status</code>) with cryptographic JWT verification.
        </div>
      </div>

      {/* Identities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEMO_IDENTITIES.map((identity) => {
          const isCurrent = identity.id === currentIdentityId;

          return (
            <div 
              key={identity.id}
              className={`rounded-2xl border p-5 transition-all duration-200 relative flex flex-col justify-between ${
                isCurrent 
                  ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20' 
                  : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-xs'
              }`}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wide ${
                      identity.role === 'admin'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : identity.role === 'teacher'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-sky-100 text-sky-800 border-sky-200'
                    }`}>
                      {identity.role}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {identity.badge}
                    </span>
                  </div>

                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Active Session
                    </span>
                  )}
                </div>

                {/* Identity Name & Title */}
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-base shadow-xs ${
                    identity.role === 'admin'
                      ? 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                      : identity.role === 'teacher'
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-600'
                      : 'bg-gradient-to-tr from-sky-600 to-blue-600'
                  }`}>
                    {identity.role === 'admin' ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : identity.role === 'teacher' ? (
                      <BookOpen className="w-5 h-5" />
                    ) : (
                      <GraduationCap className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug truncate">
                      {identity.name}
                    </h3>
                    <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                      {identity.title}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {identity.email}
                    </p>
                  </div>
                </div>

                {/* Scoped Assignment Details */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Department:</span>
                    <span className="font-bold text-slate-700">{identity.department}</span>
                  </div>
                  {identity.assignedScope && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Assigned Scope:</span>
                      <span className="font-semibold text-indigo-700 truncate max-w-[220px]" title={identity.assignedScope}>
                        {identity.assignedScope}
                      </span>
                    </div>
                  )}
                  {identity.assignedStudentId && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Student ID:</span>
                      <span className="font-mono font-bold text-slate-800">{identity.assignedStudentId}</span>
                    </div>
                  )}
                </div>

                {/* Bio / Description */}
                {identity.bio && (
                  <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                    {identity.bio}
                  </p>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onSelectIdentity(identity)}
                  disabled={isCurrent}
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-default'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200'
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Current Active Persona</span>
                    </>
                  ) : (
                    <>
                      <span>Switch to this Identity</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
