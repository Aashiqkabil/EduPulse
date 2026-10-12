export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Unknown';

export interface ScoreBreakdown {
  academicComponent: number;      // 35% weight contribution (0 - 35)
  attendanceComponent: number;    // 20% weight contribution (0 - 20)
  lmsComponent: number;           // 15% weight contribution (0 - 15)
  engagementComponent: number;    // 10% weight contribution (0 - 10)
  skillsComponent: number;        // 10% weight contribution (0 - 10)
  placementComponent: number;     // 10% weight contribution (0 - 10)
  cgpaNormalized: number;         // 0 - 100 scale
  attendanceNormalized: number;   // 0 - 100 scale
  lmsNormalized: number;          // 0 - 100 scale
  engagementNormalized: number;   // 0 - 100 scale
  skillsNormalized: number;       // 0 - 100 scale
  placementNormalized: number;    // 0 - 100 scale
}

export interface Student {
  studentId: string;
  name: string;
  email: string;
  department: string;
  semester: number;
  cgpa: number;                       // 0.0 to 10.0 scale
  attendanceRate: number;             // percentage 0 to 100
  assignmentScore: number;            // LMS completion percentage 0 to 100
  engagementScore: number;            // student engagement percentage 0 to 100
  technicalSkillsRating: number;      // rating scale 1.0 to 5.0
  placementReadinessScore: number;    // placement readiness percentage 0 to 100
  internshipCompleted: boolean;
  backlogs: number;
  feedback?: string;                  // optional qualitative notes
  successScore: number | null;        // weighted illustrative score 0 to 100 (null if incomplete)
  academicRisk: RiskLevel;
  placementRisk: RiskLevel;
  scoreBreakdown?: ScoreBreakdown;    // transparent component weights
  hasInsufficientData: boolean;
  incompleteReasons?: string[];
  isSynthetic: boolean;               // true for demo cohort, false for imported CSV
  lastUpdated: string;
}

export type NavTab = 'overview' | 'students' | 'analytics' | 'data-import';

export type DatasetSource = 'Synthetic Demo' | 'Imported CSV';

export interface DashboardFilterState {
  searchQuery: string;
  department: string;
  academicRisk: string;
  placementRisk: string;
}

export interface MetricSummary {
  totalStudents: number;
  averageSuccessScore: number;
  academicRiskCount: {
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
  placementRiskCount: {
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
}

export interface RowValidationError {
  rowNumber: number; // 1-indexed row number in data (or line in CSV)
  studentId?: string;
  column: string;
  message: string;
  severity: 'error' | 'warning';
  value?: string;
}

export interface CsvValidationSummary {
  fileName: string;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  duplicateIdsCount: number;
  missingValuesCount: number;
  errors: RowValidationError[];
  validStudents: Student[];
  allParsedRaw: Record<string, string>[];
}
