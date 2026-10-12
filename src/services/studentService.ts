import { Student, RiskLevel, ScoreBreakdown } from '../types/student';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { calculateStudentSuccessScore } from '../utils/scoringEngine';

export interface DbStudentRow {
  id?: string;
  student_id: string;
  name: string;
  email: string;
  department: string;
  semester: number;
  cgpa: number;
  attendance_rate: number;
  assignment_score: number;
  engagement_score: number;
  technical_skills_rating: number;
  placement_readiness_score: number;
  internship_completed: boolean;
  backlogs: number;
  feedback?: string | null;
  success_score?: number | null;
  academic_risk: RiskLevel;
  placement_risk: RiskLevel;
  score_breakdown?: ScoreBreakdown | null;
  has_insufficient_data: boolean;
  incomplete_reasons?: string[] | null;
  is_synthetic: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Transforms client Student model to Supabase snake_case format
 */
export function toDbStudent(student: Student): DbStudentRow {
  return {
    student_id: student.studentId,
    name: student.name,
    email: student.email,
    department: student.department,
    semester: student.semester,
    cgpa: student.cgpa,
    attendance_rate: student.attendanceRate,
    assignment_score: student.assignmentScore,
    engagement_score: student.engagementScore,
    technical_skills_rating: student.technicalSkillsRating,
    placement_readiness_score: student.placementReadinessScore,
    internship_completed: student.internshipCompleted,
    backlogs: student.backlogs,
    feedback: student.feedback || null,
    success_score: student.successScore,
    academic_risk: student.academicRisk,
    placement_risk: student.placementRisk,
    score_breakdown: student.scoreBreakdown || null,
    has_insufficient_data: student.hasInsufficientData,
    incomplete_reasons: student.incompleteReasons || [],
    is_synthetic: student.isSynthetic,
  };
}

/**
 * Transforms Supabase snake_case row back to client Student model
 */
export function fromDbStudent(row: Record<string, any>): Student {
  // Re-derive or verify score via deterministic engine if breakdown is absent
  const calculated = calculateStudentSuccessScore({
    cgpa: Number(row.cgpa),
    attendanceRate: Number(row.attendance_rate),
    assignmentScore: Number(row.assignment_score),
    engagementScore: Number(row.engagement_score),
    technicalSkillsRating: Number(row.technical_skills_rating),
    placementReadinessScore: Number(row.placement_readiness_score),
  });

  return {
    studentId: String(row.student_id || ''),
    name: String(row.name || ''),
    email: String(row.email || ''),
    department: String(row.department || ''),
    semester: Number(row.semester) || 1,
    cgpa: Number(row.cgpa) || 0,
    attendanceRate: Number(row.attendance_rate) || 0,
    assignmentScore: Number(row.assignment_score) || 0,
    engagementScore: Number(row.engagement_score) || 0,
    technicalSkillsRating: Number(row.technical_skills_rating) || 1,
    placementReadinessScore: Number(row.placement_readiness_score) || 0,
    internshipCompleted: Boolean(row.internship_completed),
    backlogs: Number(row.backlogs) || 0,
    feedback: row.feedback || undefined,
    successScore: row.success_score !== null && row.success_score !== undefined
      ? Number(row.success_score)
      : calculated.successScore,
    academicRisk: (row.academic_risk as RiskLevel) || calculated.academicRisk,
    placementRisk: (row.placement_risk as RiskLevel) || calculated.placementRisk,
    scoreBreakdown: row.score_breakdown || calculated.scoreBreakdown,
    hasInsufficientData: Boolean(row.has_insufficient_data ?? calculated.hasInsufficientData),
    incompleteReasons: row.incomplete_reasons || calculated.incompleteReasons,
    isSynthetic: Boolean(row.is_synthetic),
    lastUpdated: row.updated_at
      ? String(row.updated_at).split('T')[0]
      : new Date().toISOString().split('T')[0],
  };
}

/**
 * Verifies Supabase connection and tests table accessibility
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  count?: number;
}> {
  if (!isSupabaseConfigured()) {
    return {
      connected: false,
      message: 'Supabase credentials not configured. Running in Demo mode.',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      connected: false,
      message: 'Failed to initialize Supabase client.',
    };
  }

  try {
    const { count, error } = await client
      .from('students')
      .select('student_id', { count: 'exact', head: true });

    if (error) {
      return {
        connected: false,
        message: `Supabase error (${error.code || 'RLS/API'}): ${error.message}`,
      };
    }

    return {
      connected: true,
      message: 'Connected to EduPulse-AI Supabase project.',
      count: count ?? 0,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Network/connection error: ${err?.message || 'Unable to reach Supabase host.'}`,
    };
  }
}

/**
 * Fetches all student records from Supabase using range pagination
 * to prevent truncation on large datasets (100, 500, 1000+ records).
 */
export async function fetchStudentsFromSupabase(): Promise<{
  data: Student[];
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      data: [],
      error: 'Supabase is not configured. Running in Demo mode.',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      data: [],
      error: 'Supabase client instance not available.',
    };
  }

  try {
    const PAGE_SIZE = 1000;
    let allRows: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await client
        .from('students')
        .select('*')
        .order('student_id', { ascending: true })
        .range(from, to);

      if (error) {
        return {
          data: [],
          error: `Supabase query failed: ${error.message} (${error.code || 'permission'})`,
        };
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allRows = allRows.concat(data);
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
      }
    }

    const students = allRows.map(fromDbStudent);
    return {
      data: students,
      error: null,
    };
  } catch (err: any) {
    return {
      data: [],
      error: `Network error loading students from Supabase: ${err?.message || 'Unknown error'}`,
    };
  }
}

/**
 * Replaces the entire student cohort in Supabase with verified students.
 * Tries the atomic stored procedure `replace_student_cohort` first,
 * falling back to batched delete + chunked insert.
 */
export async function replaceCohortInSupabase(students: Student[]): Promise<{
  success: boolean;
  count: number;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      count: 0,
      error: 'Cannot persist: Supabase credentials are not configured.',
    };
  }

  if (students.length === 0) {
    return {
      success: false,
      count: 0,
      error: 'Cannot save an empty student cohort.',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      count: 0,
      error: 'Supabase client instance not available.',
    };
  }

  // Extract strictly the 14 whitelisted fields to ensure client derived scores/system fields are never sent
  const sanitizedRows = students.map((s) => ({
    student_id: s.studentId,
    name: s.name,
    email: s.email,
    department: s.department,
    semester: s.semester,
    cgpa: s.cgpa,
    attendance_rate: s.attendanceRate,
    assignment_score: s.assignmentScore,
    engagement_score: s.engagementScore,
    technical_skills_rating: s.technicalSkillsRating,
    placement_readiness_score: s.placementReadinessScore,
    internship_completed: s.internshipCompleted,
    backlogs: s.backlogs,
    feedback: s.feedback || null,
  }));

  try {
    // 1. Attempt non-destructive atomic upsert RPC first
    const { data: upsertData, error: upsertError } = await client.rpc('upsert_student_cohort', {
      p_students: sanitizedRows,
    });

    if (!upsertError && upsertData?.success) {
      return {
        success: true,
        count: upsertData.count ?? sanitizedRows.length,
        error: null,
      };
    }

    // 2. If upsert RPC not found on target schema, fall back to legacy replace_student_cohort
    if (upsertError && (upsertError.code === 'PGRST202' || upsertError.message.includes('function') || upsertError.message.includes('not found'))) {
      const { data: legacyRpcData, error: legacyRpcError } = await client.rpc('replace_student_cohort', {
        p_students: sanitizedRows,
      });

      if (!legacyRpcError && legacyRpcData?.success) {
        return {
          success: true,
          count: legacyRpcData.count ?? sanitizedRows.length,
          error: null,
        };
      }

      if (legacyRpcError) {
        return {
          success: false,
          count: 0,
          error: `Supabase RPC sync rejected: ${legacyRpcError.message} (Code: ${legacyRpcError.code || 'RLS'}). Whole-cohort direct deletion is permanently disabled for safety.`,
        };
      }
    }

    // 3. Fail closed safely: NEVER execute direct client-side DELETE on the entire table!
    const reportedError = upsertError?.message || 'Database rejected cohort synchronization.';
    return {
      success: false,
      count: 0,
      error: `Failed to persist cohort in Supabase: ${reportedError} (Code: ${upsertError?.code || 'RLS'}). Direct table deletion is disabled.`,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      error: `Unexpected error during Supabase sync: ${err?.message || 'Network exception'}`,
    };
  }
}

/**
 * Updates marks and attendance for a student via the audited teacher RPC
 */
export async function updateStudentMarksInSupabase(
  studentId: string,
  attendanceRate: number,
  assignmentScore: number
): Promise<{
  success: boolean;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase credentials are not configured.',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Supabase client instance not available.',
    };
  }

  try {
    const { data, error } = await client.rpc('teacher_update_student_marks', {
      p_student_id: studentId,
      p_attendance_rate: attendanceRate,
      p_assignment_score: assignmentScore,
    });

    if (error) {
      return {
        success: false,
        error: `Teacher update rejected: ${error.message} (Code: ${error.code || 'RPC'})`,
      };
    }

    return {
      success: Boolean(data?.success ?? true),
      error: null,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error during teacher mark update: ${err?.message || 'Unknown error'}`,
    };
  }
}

/**
 * Explicitly clears the Supabase cohort (only when user explicitly confirms)
 * Under Gate 1.5 RBAC security policy, direct client table deletion is permanently revoked.
 */
export async function clearSupabaseCohort(): Promise<{
  success: boolean;
  error: string | null;
}> {
  return {
    success: false,
    error: 'Direct client table deletion is permanently revoked under Gate 1.5 RBAC security policy. All cohort lifecycle operations must proceed through authorized administrative procedures.',
  };
}
