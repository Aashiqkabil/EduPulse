import { RiskLevel, ScoreBreakdown } from '../types/student';

/**
 * Centrally configured scoring weights (must sum to 1.0)
 * Note: These weights are illustrative prototype assumptions for the hackathon,
 * NOT official KPMG evaluation weights or certified AI prediction models.
 */
export const SCORING_WEIGHTS = {
  ACADEMIC_CGPA: 0.35,      // 35%
  ATTENDANCE: 0.20,         // 20%
  LMS_COMPLETION: 0.15,     // 15% (assignmentScore)
  ENGAGEMENT: 0.10,         // 10%
  SKILL_RATING: 0.10,       // 10%
  PLACEMENT_READINESS: 0.10 // 10%
} as const;

export const SCORING_SCALE_MAX = {
  CGPA: 10.0,
  SKILL_RATING: 5.0,
  PERCENTAGE: 100.0,
} as const;

export const RISK_THRESHOLDS = {
  ACADEMIC: {
    HIGH_CGPA_PERCENT: 50,    // Below 50% CGPA (e.g. < 5.0 CGPA)
    HIGH_ATTENDANCE: 60,      // Below 60% Attendance
    MED_CGPA_PERCENT: 65,     // Below 65% CGPA (e.g. < 6.5 CGPA)
    MED_ATTENDANCE: 75,       // Below 75% Attendance
  },
  PLACEMENT: {
    HIGH_READINESS: 40,       // Below 40 Readiness score
    HIGH_SKILL_PERCENT: 40,   // Below 40% Skill (e.g. < 2.0 / 5.0)
    MED_READINESS: 60,        // Below 60 Readiness score
    MED_SKILL_PERCENT: 60,    // Below 60% Skill (e.g. < 3.0 / 5.0)
  }
} as const;

export const SCORING_DISCLAIMER = 
  'ILLUSTRATIVE METHODOLOGY: Scoring weights (CGPA 35%, Attendance 20%, LMS 15%, Engagement 10%, Skills 10%, Placement 10%) are prototype heuristics designed for transparent dashboard demonstration. They are NOT certified AI predictions or official KPMG institutional weights.';

export interface StudentScoringInput {
  cgpa?: number | null;
  attendanceRate?: number | null;
  assignmentScore?: number | null; // LMS completion
  engagementScore?: number | null;
  technicalSkillsRating?: number | null;
  placementReadinessScore?: number | null;
}

export interface StudentScoringOutput {
  successScore: number | null;
  academicRisk: RiskLevel;
  placementRisk: RiskLevel;
  scoreBreakdown?: ScoreBreakdown;
  hasInsufficientData: boolean;
  incompleteReasons: string[];
}

/**
 * Normalizes CGPA (0 - 10.0) to a 0 - 100 percentage scale.
 */
export function normalizeCgpa(cgpa: number): number {
  if (typeof cgpa !== 'number' || isNaN(cgpa)) return 0;
  const clamped = Math.max(0, Math.min(SCORING_SCALE_MAX.CGPA, cgpa));
  return Number(((clamped / SCORING_SCALE_MAX.CGPA) * 100).toFixed(2));
}

/**
 * Normalizes technical skill rating (1.0 - 5.0) to a 0 - 100 percentage scale.
 */
export function normalizeSkillRating(rating: number): number {
  if (typeof rating !== 'number' || isNaN(rating)) return 0;
  const clamped = Math.max(0, Math.min(SCORING_SCALE_MAX.SKILL_RATING, rating));
  return Number(((clamped / SCORING_SCALE_MAX.SKILL_RATING) * 100).toFixed(2));
}

/**
 * Clamps standard percentage values to 0 - 100.
 */
export function clampPercentage(val: number): number {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Number(Math.max(0, Math.min(100, val)).toFixed(2));
}

/**
 * Classifies academic risk using deterministic thresholds.
 * High: CGPA % < 50 OR Attendance < 60%
 * Medium: CGPA % < 65 OR Attendance < 75%
 * Low: Otherwise
 * Unknown: If any required metric is missing or invalid.
 */
export function classifyAcademicRisk(
  cgpa: number | null | undefined,
  attendanceRate: number | null | undefined
): RiskLevel {
  if (cgpa === null || cgpa === undefined || isNaN(cgpa)) return 'Unknown';
  if (attendanceRate === null || attendanceRate === undefined || isNaN(attendanceRate)) return 'Unknown';

  const cgpaPct = normalizeCgpa(cgpa);
  const attendance = clampPercentage(attendanceRate);

  if (cgpaPct < RISK_THRESHOLDS.ACADEMIC.HIGH_CGPA_PERCENT || attendance < RISK_THRESHOLDS.ACADEMIC.HIGH_ATTENDANCE) {
    return 'High';
  }
  if (cgpaPct < RISK_THRESHOLDS.ACADEMIC.MED_CGPA_PERCENT || attendance < RISK_THRESHOLDS.ACADEMIC.MED_ATTENDANCE) {
    return 'Medium';
  }
  return 'Low';
}

/**
 * Classifies placement risk using deterministic thresholds.
 * High: Placement readiness < 40 OR Skill % < 40
 * Medium: Placement readiness < 60 OR Skill % < 60
 * Low: Otherwise
 * Unknown: If any required metric is missing or invalid.
 */
export function classifyPlacementRisk(
  placementReadiness: number | null | undefined,
  skillRating: number | null | undefined
): RiskLevel {
  if (placementReadiness === null || placementReadiness === undefined || isNaN(placementReadiness)) return 'Unknown';
  if (skillRating === null || skillRating === undefined || isNaN(skillRating)) return 'Unknown';

  const readiness = clampPercentage(placementReadiness);
  const skillPct = normalizeSkillRating(skillRating);

  if (readiness < RISK_THRESHOLDS.PLACEMENT.HIGH_READINESS || skillPct < RISK_THRESHOLDS.PLACEMENT.HIGH_SKILL_PERCENT) {
    return 'High';
  }
  if (readiness < RISK_THRESHOLDS.PLACEMENT.MED_READINESS || skillPct < RISK_THRESHOLDS.PLACEMENT.MED_SKILL_PERCENT) {
    return 'Medium';
  }
  return 'Low';
}

/**
 * Calculates weighted student success score and risk classifications.
 * Follows strict missing-data policy: does not fabricate zero scores silently.
 */
export function calculateStudentSuccessScore(input: StudentScoringInput): StudentScoringOutput {
  const incompleteReasons: string[] = [];

  // Validate presence and bounds
  if (input.cgpa === null || input.cgpa === undefined || isNaN(input.cgpa)) {
    incompleteReasons.push('Missing or invalid CGPA');
  } else if (input.cgpa < 0 || input.cgpa > SCORING_SCALE_MAX.CGPA) {
    incompleteReasons.push(`CGPA (${input.cgpa}) exceeds scale (0.0 to ${SCORING_SCALE_MAX.CGPA})`);
  }

  if (input.attendanceRate === null || input.attendanceRate === undefined || isNaN(input.attendanceRate)) {
    incompleteReasons.push('Missing or invalid Attendance Rate');
  } else if (input.attendanceRate < 0 || input.attendanceRate > 100) {
    incompleteReasons.push(`Attendance Rate (${input.attendanceRate}%) out of range (0 to 100)`);
  }

  if (input.assignmentScore === null || input.assignmentScore === undefined || isNaN(input.assignmentScore)) {
    incompleteReasons.push('Missing or invalid LMS Assignment Score');
  } else if (input.assignmentScore < 0 || input.assignmentScore > 100) {
    incompleteReasons.push(`LMS Assignment Score (${input.assignmentScore}%) out of range (0 to 100)`);
  }

  if (input.engagementScore === null || input.engagementScore === undefined || isNaN(input.engagementScore)) {
    incompleteReasons.push('Missing or invalid Engagement Score');
  } else if (input.engagementScore < 0 || input.engagementScore > 100) {
    incompleteReasons.push(`Engagement Score (${input.engagementScore}%) out of range (0 to 100)`);
  }

  if (input.technicalSkillsRating === null || input.technicalSkillsRating === undefined || isNaN(input.technicalSkillsRating)) {
    incompleteReasons.push('Missing or invalid Technical Skill Rating');
  } else if (input.technicalSkillsRating < 0 || input.technicalSkillsRating > SCORING_SCALE_MAX.SKILL_RATING) {
    incompleteReasons.push(`Technical Skill Rating (${input.technicalSkillsRating}) out of range (0 to ${SCORING_SCALE_MAX.SKILL_RATING})`);
  }

  if (input.placementReadinessScore === null || input.placementReadinessScore === undefined || isNaN(input.placementReadinessScore)) {
    incompleteReasons.push('Missing or invalid Placement Readiness Score');
  } else if (input.placementReadinessScore < 0 || input.placementReadinessScore > 100) {
    incompleteReasons.push(`Placement Readiness Score (${input.placementReadinessScore}%) out of range (0 to 100)`);
  }

  const academicRisk = classifyAcademicRisk(input.cgpa, input.attendanceRate);
  const placementRisk = classifyPlacementRisk(input.placementReadinessScore, input.technicalSkillsRating);

  // If any input is invalid or missing, flag incomplete record
  if (incompleteReasons.length > 0) {
    return {
      successScore: null,
      academicRisk,
      placementRisk,
      hasInsufficientData: true,
      incompleteReasons
    };
  }

  // Safe normalized values
  const cgpaNorm = normalizeCgpa(input.cgpa!);
  const attendanceNorm = clampPercentage(input.attendanceRate!);
  const lmsNorm = clampPercentage(input.assignmentScore!);
  const engagementNorm = clampPercentage(input.engagementScore!);
  const skillsNorm = normalizeSkillRating(input.technicalSkillsRating!);
  const placementNorm = clampPercentage(input.placementReadinessScore!);

  // Compute weighted components
  const academicComponent = Number((cgpaNorm * SCORING_WEIGHTS.ACADEMIC_CGPA).toFixed(2));
  const attendanceComponent = Number((attendanceNorm * SCORING_WEIGHTS.ATTENDANCE).toFixed(2));
  const lmsComponent = Number((lmsNorm * SCORING_WEIGHTS.LMS_COMPLETION).toFixed(2));
  const engagementComponent = Number((engagementNorm * SCORING_WEIGHTS.ENGAGEMENT).toFixed(2));
  const skillsComponent = Number((skillsNorm * SCORING_WEIGHTS.SKILL_RATING).toFixed(2));
  const placementComponent = Number((placementNorm * SCORING_WEIGHTS.PLACEMENT_READINESS).toFixed(2));

  // Total weighted score on 0-100 scale, rounded to 1 decimal place
  const totalScore = Number(
    (academicComponent + attendanceComponent + lmsComponent + engagementComponent + skillsComponent + placementComponent).toFixed(1)
  );

  const scoreBreakdown: ScoreBreakdown = {
    academicComponent,
    attendanceComponent,
    lmsComponent,
    engagementComponent,
    skillsComponent,
    placementComponent,
    cgpaNormalized: cgpaNorm,
    attendanceNormalized: attendanceNorm,
    lmsNormalized: lmsNorm,
    engagementNormalized: engagementNorm,
    skillsNormalized: skillsNorm,
    placementNormalized: placementNorm
  };

  return {
    successScore: Math.min(100, Math.max(0, totalScore)),
    academicRisk,
    placementRisk,
    scoreBreakdown,
    hasInsufficientData: false,
    incompleteReasons: []
  };
}
