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
 * Fetches all student records from Supabase
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
    const { data, error } = await client
      .from('students')
      .select('*')
      .order('student_id', { ascending: true });

    if (error) {
      return {
        data: [],
        error: `Supabase query failed: ${error.message} (${error.code || 'permission'})`,
      };
    }

    const students = (data || []).map(fromDbStudent);
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
 * Replaces the entire student cohort in Supabase with verified students
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

  try {
    // 1. Delete existing rows
    const { error: deleteError } = await client
      .from('students')
      .delete()
      .neq('student_id', '');

    if (deleteError) {
      return {
        success: false,
        count: 0,
        error: `Failed to clear existing cohort before import: ${deleteError.message} (Code: ${deleteError.code || 'RLS'})`,
      };
    }

    // 2. Prepare payload
    const rows = students.map(toDbStudent);

    // 3. Insert new verified cohort in batches of 100 to avoid request size limits
    const BATCH_SIZE = 100;
    let insertedTotal = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await client
        .from('students')
        .insert(batch);

      if (insertError) {
        return {
          success: false,
          count: insertedTotal,
          error: `Failed during row insertion (${i + 1}-${i + batch.length}): ${insertError.message} (Code: ${insertError.code || 'RLS'})`,
        };
      }
      insertedTotal += batch.length;
    }

    return {
      success: true,
      count: insertedTotal,
      error: null,
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
 * Explicitly clears the Supabase cohort (only when user explicitly confirms)
 */
export async function clearSupabaseCohort(): Promise<{
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
      error: 'Supabase client is not available.',
    };
  }

  try {
    const { error } = await client
      .from('students')
      .delete()
      .neq('student_id', '');

    if (error) {
      return {
        success: false,
        error: `Failed to clear database cohort: ${error.message}`,
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error clearing database cohort: ${err?.message || 'Unknown error'}`,
    };
  }
}
