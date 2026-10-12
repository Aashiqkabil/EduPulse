import Papa from 'papaparse';
import type { Student, RowValidationError, CsvValidationSummary } from '../types/student';
import { calculateStudentSuccessScore } from './scoringEngine';

export interface ExpectedColumnDef {
  key: keyof Student | string;
  header: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  min?: number;
  max?: number;
  description: string;
}

export const CSV_SCHEMA_COLUMNS: ExpectedColumnDef[] = [
  { key: 'studentId', header: 'studentId', required: true, type: 'string', description: 'Unique Student ID (e.g. STU-2024-001)' },
  { key: 'name', header: 'name', required: true, type: 'string', description: 'Student Full Name' },
  { key: 'email', header: 'email', required: true, type: 'string', description: 'Student Institutional Email' },
  { key: 'department', header: 'department', required: true, type: 'string', description: 'Academic Department' },
  { key: 'semester', header: 'semester', required: true, type: 'number', min: 1, max: 8, description: 'Current Semester (1-8)' },
  { key: 'cgpa', header: 'cgpa', required: true, type: 'number', min: 0, max: 10, description: 'CGPA Scale (0.0 - 10.0)' },
  { key: 'attendanceRate', header: 'attendanceRate', required: true, type: 'number', min: 0, max: 100, description: 'Attendance percentage (0 - 100)' },
  { key: 'assignmentScore', header: 'assignmentScore', required: true, type: 'number', min: 0, max: 100, description: 'LMS Assignment Completion percentage (0 - 100)' },
  { key: 'engagementScore', header: 'engagementScore', required: true, type: 'number', min: 0, max: 100, description: 'Student Engagement score (0 - 100)' },
  { key: 'technicalSkillsRating', header: 'technicalSkillsRating', required: true, type: 'number', min: 1, max: 5, description: 'Technical Skills Rating (1.0 - 5.0)' },
  { key: 'placementReadinessScore', header: 'placementReadinessScore', required: true, type: 'number', min: 0, max: 100, description: 'Placement Readiness percentage (0 - 100)' },
  { key: 'internshipCompleted', header: 'internshipCompleted', required: true, type: 'boolean', description: 'Internship status (TRUE/FALSE)' },
  { key: 'backlogs', header: 'backlogs', required: true, type: 'number', min: 0, max: 30, description: 'Active backlog count (integer >= 0)' },
  { key: 'feedback', header: 'feedback', required: false, type: 'string', description: 'Optional faculty notes or mentor comments' },
];

/**
 * Normalizes header string (trims whitespace, handles case insensitivity)
 */
export function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Parses a boolean string value safely
 */
export function parseBooleanValue(val: string): boolean | null {
  const normalized = val.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'n') return false;
  return null;
}

/**
 * Validates raw CSV content using PapaParse and returns a comprehensive validation summary.
 */
export function validateCsvContent(csvString: string, fileName = 'uploaded.csv'): Promise<CsvValidationSummary> {
  return new Promise((resolve) => {
    const trimmedInput = csvString.trim();

    if (!trimmedInput) {
      resolve({
        fileName,
        totalRows: 0,
        validRowsCount: 0,
        invalidRowsCount: 0,
        duplicateIdsCount: 0,
        missingValuesCount: 0,
        errors: [{
          rowNumber: 1,
          column: 'file',
          message: 'The uploaded CSV file is empty. Please provide a file with valid headers and student rows.',
          severity: 'error'
        }],
        validStudents: [],
        allParsedRaw: []
      });
      return;
    }

    Papa.parse<Record<string, string>>(csvString, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        const rawRows = results.data;
        const parseErrors = results.errors;
        const headers = results.meta.fields || [];

        const errors: RowValidationError[] = [];
        let missingValuesCount = 0;
        let duplicateIdsCount = 0;

        // 1. Report parser-level syntax errors (malformed quoting, row length mismatch, etc.)
        parseErrors.forEach((pe) => {
          errors.push({
            rowNumber: pe.row !== undefined ? pe.row + 2 : 1, // account for 1-indexed line after header
            column: 'format',
            message: `CSV parsing error: ${pe.message}`,
            severity: 'error'
          });
        });

        // 2. Check for missing required headers
        const normalizedHeadersMap: Record<string, string> = {};
        headers.forEach(h => {
          normalizedHeadersMap[normalizeHeader(h)] = h;
        });

        const missingRequiredHeaders = CSV_SCHEMA_COLUMNS
          .filter(c => c.required)
          .filter(c => !normalizedHeadersMap[normalizeHeader(c.header)]);

        if (missingRequiredHeaders.length > 0) {
          missingRequiredHeaders.forEach(mc => {
            errors.push({
              rowNumber: 1,
              column: mc.header,
              message: `Missing required column header: "${mc.header}" (${mc.description})`,
              severity: 'error'
            });
          });
        }

        // 3. Row-level validation
        const validStudents: Student[] = [];
        const seenStudentIds = new Set<string>();
        const duplicateStudentIdsInFile = new Set<string>();

        // Pre-scan duplicates to report all duplicate occurrences accurately
        rawRows.forEach((row, _idx) => {
          const idKey = normalizedHeadersMap[normalizeHeader('studentId')];
          const rawId = idKey && row[idKey] ? row[idKey].trim() : '';
          if (rawId) {
            if (seenStudentIds.has(rawId)) {
              duplicateStudentIdsInFile.add(rawId);
            }
            seenStudentIds.add(rawId);
          }
        });

        // Clear for processing
        seenStudentIds.clear();

        rawRows.forEach((row, index) => {
          const rowNumber = index + 2; // Line 1 is header, first data row is 2
          const rowErrors: RowValidationError[] = [];

          // Helper to get raw value by column definition
          const getVal = (col: ExpectedColumnDef): string => {
            const actualHeader = normalizedHeadersMap[normalizeHeader(col.header)];
            if (!actualHeader || row[actualHeader] === undefined) return '';
            return String(row[actualHeader]).trim();
          };

          // Validate studentId
          const studentId = getVal(CSV_SCHEMA_COLUMNS[0]);
          if (!studentId) {
            rowErrors.push({
              rowNumber,
              column: 'studentId',
              message: 'studentId is required and cannot be empty.',
              severity: 'error'
            });
            missingValuesCount++;
          } else {
            if (seenStudentIds.has(studentId) || duplicateStudentIdsInFile.has(studentId)) {
              rowErrors.push({
                rowNumber,
                studentId,
                column: 'studentId',
                message: `Duplicate studentId "${studentId}" found in import. Each record must have a unique ID.`,
                severity: 'error',
                value: studentId
              });
              duplicateIdsCount++;
            }
            seenStudentIds.add(studentId);
          }

          // Validate Name
          const name = getVal(CSV_SCHEMA_COLUMNS[1]);
          if (!name) {
            rowErrors.push({
              rowNumber,
              studentId,
              column: 'name',
              message: 'Student name is required.',
              severity: 'error'
            });
            missingValuesCount++;
          }

          // Validate Email
          const email = getVal(CSV_SCHEMA_COLUMNS[2]);
          if (!email) {
            rowErrors.push({
              rowNumber,
              studentId,
              column: 'email',
              message: 'Institutional email is required.',
              severity: 'error'
            });
            missingValuesCount++;
          } else if (!email.includes('@')) {
            rowErrors.push({
              rowNumber,
              studentId,
              column: 'email',
              message: `Invalid email address format: "${email}".`,
              severity: 'error',
              value: email
            });
          }

          // Validate Department
          const department = getVal(CSV_SCHEMA_COLUMNS[3]);
          if (!department) {
            rowErrors.push({
              rowNumber,
              studentId,
              column: 'department',
              message: 'Department is required.',
              severity: 'error'
            });
            missingValuesCount++;
          }

          // Validate Semester
          const rawSem = getVal(CSV_SCHEMA_COLUMNS[4]);
          const semNum = Number(rawSem);
          if (!rawSem) {
            rowErrors.push({ rowNumber, studentId, column: 'semester', message: 'Semester is required.', severity: 'error' });
            missingValuesCount++;
          } else if (isNaN(semNum) || !Number.isInteger(semNum) || semNum < 1 || semNum > 8) {
            rowErrors.push({
              rowNumber,
              studentId,
              column: 'semester',
              message: `Semester must be an integer between 1 and 8 (received "${rawSem}").`,
              severity: 'error',
              value: rawSem
            });
          }

          // Validate CGPA
          const rawCgpa = getVal(CSV_SCHEMA_COLUMNS[5]);
          const cgpaNum = Number(rawCgpa);
          if (!rawCgpa) {
            rowErrors.push({ rowNumber, studentId, column: 'cgpa', message: 'CGPA is required.', severity: 'error' });
            missingValuesCount++;
          } else if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
            rowErrors.push({
              rowNumber,
              studentId,
              column: 'cgpa',
              message: `CGPA must be a valid number between 0.0 and 10.0 (received "${rawCgpa}").`,
              severity: 'error',
              value: rawCgpa
            });
          }

          // Validate Attendance Rate
          const rawAtt = getVal(CSV_SCHEMA_COLUMNS[6]);
          const attNum = Number(rawAtt);
          if (!rawAtt) {
            rowErrors.push({ rowNumber, studentId, column: 'attendanceRate', message: 'Attendance rate is required.', severity: 'error' });
            missingValuesCount++;
          } else if (isNaN(attNum) || attNum < 0 || attNum > 100) {
            rowErrors.push({
              rowNumber,
              studentId,
              column: 'attendanceRate',
              message: `Attendance rate must be a percentage between 0 and 100 (received "${rawAtt}").`,
              severity: 'error',
              value: rawAtt
            });
          }

          // Validate Assignment Score / LMS Completion
          const rawLms = getVal(CSV_SCHEMA_COLUMNS[7]);
          const lmsNum = Number(rawLms);
          if (!rawLms) {
            rowErrors.push({ rowNumber, studentId, column: 'assignmentScore', message: 'Assignment score / LMS completion is required.', severity: 'error' });
            missingValuesCount++;
          } else if (isNaN(lmsNum) || lmsNum < 0 || lmsNum > 100) {
            rowErrors.push({
              rowNumber,
              studentId,
              column: 'assignmentScore',
              message: `Assignment / LMS score must be between 0 and 100 (received "${rawLms}").`,
              severity: 'error',
              value: rawLms
            });
          }

          // Validate Engagement Score
          const rawEng = getVal(CSV_SCHEMA_COLUMNS[8]);
          const engNum = Number(rawEng);
          if (!rawEng) {
            rowErrors.push({ rowNumber, studentId, column: 'engagementScore', message: 'Engagement score is required.', severity: 'error' });
            missingValuesCount++;
          } else if (isNaN(engNum) || engNum < 0 || engNum > 100) {
            rowErrors.push({
              rowNumber,
              studentId,
              column: 'engagementScore',
              message: `Engagement score must be between 0 and 100 (received "${rawEng}").`,
              severity: 'error',
              value: rawEng
            });
          }

          // Validate Technical Skills Rating
          const rawSkill = getVal(CSV_SCHEMA_COLUMNS[9]);
          const skillNum = Number(rawSkill);
          if (!rawSkill) {
            rowErrors.push({ rowNumber, studentId, column: 'technicalSkillsRating', message: 'Technical skills rating is required.', severity: 'error' });
            missingValuesCount++;
          } else if (isNaN(skillNum) || skillNum < 1.0 || skillNum > 5.0) {
            rowErrors.push({
              rowNumber,
              studentId,
              column: 'technicalSkillsRating',
              message: `Technical skill rating must be between 1.0 and 5.0 (received "${rawSkill}").`,
              severity: 'error',
              value: rawSkill
            });
          }

          // Validate Placement Readiness Score
          const rawPlacement = getVal(CSV_SCHEMA_COLUMNS[10]);
          const placementNum = Number(rawPlacement);
          if (!rawPlacement) {
            rowErrors.push({ rowNumber, studentId, column: 'placementReadinessScore', message: 'Placement readiness score is required.', severity: 'error' });
            missingValuesCount++;
          } else if (isNaN(placementNum) || placementNum < 0 || placementNum > 100) {
            rowErrors.push({
              rowNumber,
              studentId,
              column: 'placementReadinessScore',
              message: `Placement readiness score must be between 0 and 100 (received "${rawPlacement}").`,
              severity: 'error',
              value: rawPlacement
            });
          }

          // Validate Internship Completed
          const rawIntern = getVal(CSV_SCHEMA_COLUMNS[11]);
          const internBool = parseBooleanValue(rawIntern);
          if (internBool === null) {
            rowErrors.push({
              rowNumber,
              studentId,
              column: 'internshipCompleted',
              message: `Internship completion must be TRUE or FALSE (received "${rawIntern}").`,
              severity: 'error',
              value: rawIntern
            });
            if (!rawIntern) missingValuesCount++;
          }

          // Validate Backlogs
          const rawBacklogs = getVal(CSV_SCHEMA_COLUMNS[12]);
          const backlogsNum = Number(rawBacklogs);
          if (!rawBacklogs) {
            rowErrors.push({ rowNumber, studentId, column: 'backlogs', message: 'Backlogs count is required.', severity: 'error' });
            missingValuesCount++;
          } else if (isNaN(backlogsNum) || !Number.isInteger(backlogsNum) || backlogsNum < 0) {
            rowErrors.push({
              rowNumber,
              studentId,
              column: 'backlogs',
              message: `Backlogs count must be a non-negative integer (received "${rawBacklogs}").`,
              severity: 'error',
              value: rawBacklogs
            });
          }

          // Optional Feedback
          const feedback = getVal(CSV_SCHEMA_COLUMNS[13]);

          // Accumulate row errors
          if (rowErrors.length > 0) {
            errors.push(...rowErrors);
          } else {
            // Valid row: compute scores via centralized scoring engine
            const calculated = calculateStudentSuccessScore({
              cgpa: cgpaNum,
              attendanceRate: attNum,
              assignmentScore: lmsNum,
              engagementScore: engNum,
              technicalSkillsRating: skillNum,
              placementReadinessScore: placementNum
            });

            validStudents.push({
              studentId,
              name,
              email,
              department,
              semester: semNum,
              cgpa: cgpaNum,
              attendanceRate: attNum,
              assignmentScore: lmsNum,
              engagementScore: engNum,
              technicalSkillsRating: skillNum,
              placementReadinessScore: placementNum,
              internshipCompleted: internBool!,
              backlogs: backlogsNum,
              feedback: feedback || undefined,
              successScore: calculated.successScore,
              academicRisk: calculated.academicRisk,
              placementRisk: calculated.placementRisk,
              scoreBreakdown: calculated.scoreBreakdown,
              hasInsufficientData: calculated.hasInsufficientData,
              incompleteReasons: calculated.incompleteReasons,
              isSynthetic: false, // Explicitly labeled as imported CSV!
              lastUpdated: new Date().toISOString().split('T')[0]
            });
          }
        });

        // Compute row counts
        const totalRows = rawRows.length;
        const validRowsCount = validStudents.length;
        const invalidRowsCount = totalRows - validRowsCount;

        resolve({
          fileName,
          totalRows,
          validRowsCount,
          invalidRowsCount,
          duplicateIdsCount,
          missingValuesCount,
          errors,
          validStudents,
          allParsedRaw: rawRows
        });
      }
    });
  });
}

/**
 * Exports validation errors to a CSV string using Papa.unparse
 */
export function exportValidationErrorsToCsv(errors: RowValidationError[]): string {
  const exportRows = errors.map(err => ({
    'Row Number': err.rowNumber,
    'Student ID': err.studentId || 'N/A',
    'Affected Column': err.column,
    'Severity': err.severity.toUpperCase(),
    'Invalid Value': err.value !== undefined ? err.value : '',
    'Validation Message': err.message
  }));

  return Papa.unparse(exportRows);
}

/**
 * Generates sample CSV template matching the exact unified schema
 */
export function generateSampleCsvTemplate(): string {
  const sampleRows = [
    {
      studentId: 'STU-2024-101',
      name: 'Aditi Varma',
      email: 'aditi.v@university.edu',
      department: 'Computer Science',
      semester: 6,
      cgpa: 8.75,
      attendanceRate: 92,
      assignmentScore: 88,
      engagementScore: 85,
      technicalSkillsRating: 4.5,
      placementReadinessScore: 88,
      internshipCompleted: 'TRUE',
      backlogs: 0,
      feedback: 'Excellent problem solving and algorithm skills'
    },
    {
      studentId: 'STU-2024-102',
      name: 'Kunal Kapoor',
      email: 'kunal.k@university.edu',
      department: 'Data Science',
      semester: 6,
      cgpa: 6.20,
      attendanceRate: 64,
      assignmentScore: 60,
      engagementScore: 58,
      technicalSkillsRating: 2.8,
      placementReadinessScore: 48,
      internshipCompleted: 'FALSE',
      backlogs: 2,
      feedback: 'Needs intervention in core statistics and attendance'
    },
    {
      studentId: 'STU-2024-103',
      name: 'Sunita Rao',
      email: 'sunita.rao@university.edu',
      department: 'Electronics & Comm',
      semester: 6,
      cgpa: 7.80,
      attendanceRate: 85,
      assignmentScore: 82,
      engagementScore: 78,
      technicalSkillsRating: 3.8,
      placementReadinessScore: 72,
      internshipCompleted: 'TRUE',
      backlogs: 0,
      feedback: 'Good project performance in embedded circuits'
    }
  ];

  return Papa.unparse(sampleRows);
}
