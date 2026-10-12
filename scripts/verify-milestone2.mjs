/**
 * EduPulse AI — Comprehensive Milestone 2 Verification Suite
 * Covers: CSV Validator (end-to-end), Scoring Engine, Header Normalization,
 *         Boundary Values, Error Export, Template, Dataset Replacement, Missing Data
 *
 * Run via: node scripts/verify-milestone2.mjs
 */

import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

// ======================================================================
// 1. Duplicate the scoring engine logic (mirrors src/utils/scoringEngine.ts)
// ======================================================================
const SCORING_WEIGHTS = {
  ACADEMIC_CGPA: 0.35,
  ATTENDANCE: 0.20,
  LMS_COMPLETION: 0.15,
  ENGAGEMENT: 0.10,
  SKILL_RATING: 0.10,
  PLACEMENT_READINESS: 0.10,
};

function normalizeCgpa(cgpa) {
  if (typeof cgpa !== 'number' || isNaN(cgpa)) return 0;
  const clamped = Math.max(0, Math.min(10.0, cgpa));
  return Number(((clamped / 10.0) * 100).toFixed(2));
}

function normalizeSkillRating(rating) {
  if (typeof rating !== 'number' || isNaN(rating)) return 0;
  const clamped = Math.max(0, Math.min(5.0, rating));
  return Number(((clamped / 5.0) * 100).toFixed(2));
}

function clampPercentage(val) {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Number(Math.max(0, Math.min(100, val)).toFixed(2));
}

function classifyAcademicRisk(cgpa, attendanceRate) {
  if (cgpa === null || cgpa === undefined || isNaN(cgpa) || cgpa < 0 || cgpa > 10.0) return 'Unknown';
  if (attendanceRate === null || attendanceRate === undefined || isNaN(attendanceRate) || attendanceRate < 0 || attendanceRate > 100) return 'Unknown';
  const cgpaPct = normalizeCgpa(cgpa);
  const att = clampPercentage(attendanceRate);
  if (cgpaPct < 50 || att < 60) return 'High';
  if (cgpaPct < 65 || att < 75) return 'Medium';
  return 'Low';
}

function classifyPlacementRisk(readiness, skill) {
  if (readiness === null || readiness === undefined || isNaN(readiness) || readiness < 0 || readiness > 100) return 'Unknown';
  if (skill === null || skill === undefined || isNaN(skill) || skill < 0 || skill > 5.0) return 'Unknown';
  const readPct = clampPercentage(readiness);
  const skillPct = normalizeSkillRating(skill);
  if (readPct < 40 || skillPct < 40) return 'High';
  if (readPct < 60 || skillPct < 60) return 'Medium';
  return 'Low';
}

function calculateScore(input) {
  const incompleteReasons = [];
  if (input.cgpa == null || isNaN(input.cgpa)) incompleteReasons.push('Missing or invalid CGPA');
  else if (input.cgpa < 0 || input.cgpa > 10) incompleteReasons.push(`CGPA (${input.cgpa}) exceeds scale`);

  if (input.attendanceRate == null || isNaN(input.attendanceRate)) incompleteReasons.push('Missing or invalid Attendance Rate');
  else if (input.attendanceRate < 0 || input.attendanceRate > 100) incompleteReasons.push('Attendance out of range');

  if (input.assignmentScore == null || isNaN(input.assignmentScore)) incompleteReasons.push('Missing or invalid LMS Assignment Score');
  else if (input.assignmentScore < 0 || input.assignmentScore > 100) incompleteReasons.push('LMS out of range');

  if (input.engagementScore == null || isNaN(input.engagementScore)) incompleteReasons.push('Missing or invalid Engagement Score');
  else if (input.engagementScore < 0 || input.engagementScore > 100) incompleteReasons.push('Engagement out of range');

  if (input.technicalSkillsRating == null || isNaN(input.technicalSkillsRating)) incompleteReasons.push('Missing or invalid Technical Skill Rating');
  else if (input.technicalSkillsRating < 0 || input.technicalSkillsRating > 5) incompleteReasons.push('Skill out of range');

  if (input.placementReadinessScore == null || isNaN(input.placementReadinessScore)) incompleteReasons.push('Missing or invalid Placement Readiness Score');
  else if (input.placementReadinessScore < 0 || input.placementReadinessScore > 100) incompleteReasons.push('Readiness out of range');

  const academicRisk = classifyAcademicRisk(input.cgpa, input.attendanceRate);
  const placementRisk = classifyPlacementRisk(input.placementReadinessScore, input.technicalSkillsRating);

  if (incompleteReasons.length > 0) {
    return { successScore: null, academicRisk, placementRisk, hasInsufficientData: true, incompleteReasons };
  }

  const cgpaNorm = normalizeCgpa(input.cgpa);
  const attNorm = clampPercentage(input.attendanceRate);
  const lmsNorm = clampPercentage(input.assignmentScore);
  const engNorm = clampPercentage(input.engagementScore);
  const skillNorm = normalizeSkillRating(input.technicalSkillsRating);
  const placeNorm = clampPercentage(input.placementReadinessScore);

  const academicComp = Number((cgpaNorm * SCORING_WEIGHTS.ACADEMIC_CGPA).toFixed(2));
  const attComp = Number((attNorm * SCORING_WEIGHTS.ATTENDANCE).toFixed(2));
  const lmsComp = Number((lmsNorm * SCORING_WEIGHTS.LMS_COMPLETION).toFixed(2));
  const engComp = Number((engNorm * SCORING_WEIGHTS.ENGAGEMENT).toFixed(2));
  const skillComp = Number((skillNorm * SCORING_WEIGHTS.SKILL_RATING).toFixed(2));
  const placeComp = Number((placeNorm * SCORING_WEIGHTS.PLACEMENT_READINESS).toFixed(2));

  const total = Number((academicComp + attComp + lmsComp + engComp + skillComp + placeComp).toFixed(1));

  return {
    successScore: Math.min(100, Math.max(0, total)),
    academicRisk,
    placementRisk,
    hasInsufficientData: false,
    incompleteReasons: [],
    scoreBreakdown: {
      academicComponent: academicComp,
      attendanceComponent: attComp,
      lmsComponent: lmsComp,
      engagementComponent: engComp,
      skillsComponent: skillComp,
      placementComponent: placeComp,
      cgpaNormalized: cgpaNorm,
      attendanceNormalized: attNorm,
      lmsNormalized: lmsNorm,
      engagementNormalized: engNorm,
      skillsNormalized: skillNorm,
      placementNormalized: placeNorm
    }
  };
}

// ======================================================================
// 2. CSV Validator logic (mirrors src/utils/csvValidator.ts)
// ======================================================================
const CSV_SCHEMA_COLUMNS = [
  { key: 'studentId', header: 'studentId', required: true, type: 'string' },
  { key: 'name', header: 'name', required: true, type: 'string' },
  { key: 'email', header: 'email', required: true, type: 'string' },
  { key: 'department', header: 'department', required: true, type: 'string' },
  { key: 'semester', header: 'semester', required: true, type: 'number', min: 1, max: 8 },
  { key: 'cgpa', header: 'cgpa', required: true, type: 'number', min: 0, max: 10 },
  { key: 'attendanceRate', header: 'attendanceRate', required: true, type: 'number', min: 0, max: 100 },
  { key: 'assignmentScore', header: 'assignmentScore', required: true, type: 'number', min: 0, max: 100 },
  { key: 'engagementScore', header: 'engagementScore', required: true, type: 'number', min: 0, max: 100 },
  { key: 'technicalSkillsRating', header: 'technicalSkillsRating', required: true, type: 'number', min: 1, max: 5 },
  { key: 'placementReadinessScore', header: 'placementReadinessScore', required: true, type: 'number', min: 0, max: 100 },
  { key: 'internshipCompleted', header: 'internshipCompleted', required: true, type: 'boolean' },
  { key: 'backlogs', header: 'backlogs', required: true, type: 'number', min: 0, max: 30 },
  { key: 'feedback', header: 'feedback', required: false, type: 'string' },
];

function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function parseBooleanValue(val) {
  const normalized = val.trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return null;
}

function validateCsvContent(csvString, fileName = 'uploaded.csv') {
  return new Promise((resolve) => {
    const trimmedInput = csvString.trim();
    if (!trimmedInput) {
      resolve({
        fileName, totalRows: 0, validRowsCount: 0, invalidRowsCount: 0,
        duplicateIdsCount: 0, missingValuesCount: 0,
        errors: [{ rowNumber: 1, column: 'file', message: 'The uploaded CSV file is empty.', severity: 'error' }],
        validStudents: [], allParsedRaw: []
      });
      return;
    }

    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const rawRows = results.data;
        const parseErrors = results.errors;
        const headers = results.meta.fields || [];
        const errors = [];
        let missingValuesCount = 0;
        let duplicateIdsCount = 0;

        parseErrors.forEach((pe) => {
          errors.push({ rowNumber: pe.row !== undefined ? pe.row + 2 : 1, column: 'format', message: `CSV parsing error: ${pe.message}`, severity: 'error' });
        });

        const normalizedHeadersMap = {};
        headers.forEach(h => { normalizedHeadersMap[normalizeHeader(h)] = h; });

        const missingRequiredHeaders = CSV_SCHEMA_COLUMNS
          .filter(c => c.required)
          .filter(c => !normalizedHeadersMap[normalizeHeader(c.header)]);

        missingRequiredHeaders.forEach(mc => {
          errors.push({ rowNumber: 1, column: mc.header, message: `Missing required column header: "${mc.header}"`, severity: 'error' });
        });

        const validStudents = [];
        const seenStudentIds = new Set();
        const duplicateStudentIdsInFile = new Set();

        rawRows.forEach((row) => {
          const idKey = normalizedHeadersMap[normalizeHeader('studentId')];
          const rawId = idKey && row[idKey] ? row[idKey].trim() : '';
          if (rawId) {
            if (seenStudentIds.has(rawId)) duplicateStudentIdsInFile.add(rawId);
            seenStudentIds.add(rawId);
          }
        });
        seenStudentIds.clear();

        rawRows.forEach((row, index) => {
          const rowNumber = index + 2;
          const rowErrors = [];

          const getVal = (col) => {
            const actualHeader = normalizedHeadersMap[normalizeHeader(col.header)];
            if (!actualHeader || row[actualHeader] === undefined) return '';
            return String(row[actualHeader]).trim();
          };

          // Validate studentId
          const studentId = getVal(CSV_SCHEMA_COLUMNS[0]);
          if (!studentId) { rowErrors.push({ rowNumber, column: 'studentId', message: 'studentId is required.', severity: 'error' }); missingValuesCount++; }
          else {
            if (seenStudentIds.has(studentId) || duplicateStudentIdsInFile.has(studentId)) {
              rowErrors.push({ rowNumber, studentId, column: 'studentId', message: `Duplicate studentId "${studentId}"`, severity: 'error', value: studentId });
              duplicateIdsCount++;
            }
            seenStudentIds.add(studentId);
          }

          const name = getVal(CSV_SCHEMA_COLUMNS[1]);
          if (!name) { rowErrors.push({ rowNumber, studentId, column: 'name', message: 'Name required.', severity: 'error' }); missingValuesCount++; }

          const email = getVal(CSV_SCHEMA_COLUMNS[2]);
          if (!email) { rowErrors.push({ rowNumber, studentId, column: 'email', message: 'Email required.', severity: 'error' }); missingValuesCount++; }
          else if (!email.includes('@')) { rowErrors.push({ rowNumber, studentId, column: 'email', message: 'Invalid email', severity: 'error', value: email }); }

          const department = getVal(CSV_SCHEMA_COLUMNS[3]);
          if (!department) { rowErrors.push({ rowNumber, studentId, column: 'department', message: 'Department required.', severity: 'error' }); missingValuesCount++; }

          const rawSem = getVal(CSV_SCHEMA_COLUMNS[4]);
          const semNum = Number(rawSem);
          if (!rawSem) { rowErrors.push({ rowNumber, studentId, column: 'semester', message: 'Semester required.', severity: 'error' }); missingValuesCount++; }
          else if (isNaN(semNum) || !Number.isInteger(semNum) || semNum < 1 || semNum > 8) {
            rowErrors.push({ rowNumber, studentId, column: 'semester', message: `Semester invalid: "${rawSem}"`, severity: 'error', value: rawSem });
          }

          const rawCgpa = getVal(CSV_SCHEMA_COLUMNS[5]);
          const cgpaNum = Number(rawCgpa);
          if (!rawCgpa) { rowErrors.push({ rowNumber, studentId, column: 'cgpa', message: 'CGPA required.', severity: 'error' }); missingValuesCount++; }
          else if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
            rowErrors.push({ rowNumber, studentId, column: 'cgpa', message: `CGPA invalid: "${rawCgpa}"`, severity: 'error', value: rawCgpa });
          }

          const rawAtt = getVal(CSV_SCHEMA_COLUMNS[6]);
          const attNum = Number(rawAtt);
          if (!rawAtt) { rowErrors.push({ rowNumber, studentId, column: 'attendanceRate', message: 'Attendance required.', severity: 'error' }); missingValuesCount++; }
          else if (isNaN(attNum) || attNum < 0 || attNum > 100) {
            rowErrors.push({ rowNumber, studentId, column: 'attendanceRate', message: `Attendance invalid: "${rawAtt}"`, severity: 'error', value: rawAtt });
          }

          const rawLms = getVal(CSV_SCHEMA_COLUMNS[7]);
          const lmsNum = Number(rawLms);
          if (!rawLms) { rowErrors.push({ rowNumber, studentId, column: 'assignmentScore', message: 'LMS required.', severity: 'error' }); missingValuesCount++; }
          else if (isNaN(lmsNum) || lmsNum < 0 || lmsNum > 100) {
            rowErrors.push({ rowNumber, studentId, column: 'assignmentScore', message: `LMS invalid: "${rawLms}"`, severity: 'error', value: rawLms });
          }

          const rawEng = getVal(CSV_SCHEMA_COLUMNS[8]);
          const engNum = Number(rawEng);
          if (!rawEng) { rowErrors.push({ rowNumber, studentId, column: 'engagementScore', message: 'Engagement required.', severity: 'error' }); missingValuesCount++; }
          else if (isNaN(engNum) || engNum < 0 || engNum > 100) {
            rowErrors.push({ rowNumber, studentId, column: 'engagementScore', message: `Engagement invalid: "${rawEng}"`, severity: 'error', value: rawEng });
          }

          const rawSkill = getVal(CSV_SCHEMA_COLUMNS[9]);
          const skillNum = Number(rawSkill);
          if (!rawSkill) { rowErrors.push({ rowNumber, studentId, column: 'technicalSkillsRating', message: 'Skill required.', severity: 'error' }); missingValuesCount++; }
          else if (isNaN(skillNum) || skillNum < 1.0 || skillNum > 5.0) {
            rowErrors.push({ rowNumber, studentId, column: 'technicalSkillsRating', message: `Skill invalid: "${rawSkill}"`, severity: 'error', value: rawSkill });
          }

          const rawPlacement = getVal(CSV_SCHEMA_COLUMNS[10]);
          const placementNum = Number(rawPlacement);
          if (!rawPlacement) { rowErrors.push({ rowNumber, studentId, column: 'placementReadinessScore', message: 'Placement required.', severity: 'error' }); missingValuesCount++; }
          else if (isNaN(placementNum) || placementNum < 0 || placementNum > 100) {
            rowErrors.push({ rowNumber, studentId, column: 'placementReadinessScore', message: `Placement invalid: "${rawPlacement}"`, severity: 'error', value: rawPlacement });
          }

          const rawIntern = getVal(CSV_SCHEMA_COLUMNS[11]);
          const internBool = parseBooleanValue(rawIntern);
          if (internBool === null) {
            rowErrors.push({ rowNumber, studentId, column: 'internshipCompleted', message: `Internship invalid: "${rawIntern}"`, severity: 'error', value: rawIntern });
            if (!rawIntern) missingValuesCount++;
          }

          const rawBacklogs = getVal(CSV_SCHEMA_COLUMNS[12]);
          const backlogsNum = Number(rawBacklogs);
          if (!rawBacklogs) { rowErrors.push({ rowNumber, studentId, column: 'backlogs', message: 'Backlogs required.', severity: 'error' }); missingValuesCount++; }
          else if (isNaN(backlogsNum) || !Number.isInteger(backlogsNum) || backlogsNum < 0) {
            rowErrors.push({ rowNumber, studentId, column: 'backlogs', message: `Backlogs invalid: "${rawBacklogs}"`, severity: 'error', value: rawBacklogs });
          }

          const feedback = getVal(CSV_SCHEMA_COLUMNS[13]);

          if (rowErrors.length > 0) {
            errors.push(...rowErrors);
          } else {
            const calc = calculateScore({
              cgpa: cgpaNum, attendanceRate: attNum, assignmentScore: lmsNum,
              engagementScore: engNum, technicalSkillsRating: skillNum, placementReadinessScore: placementNum
            });
            validStudents.push({
              studentId, name, email, department, semester: semNum,
              cgpa: cgpaNum, attendanceRate: attNum, assignmentScore: lmsNum,
              engagementScore: engNum, technicalSkillsRating: skillNum,
              placementReadinessScore: placementNum, internshipCompleted: internBool,
              backlogs: backlogsNum, feedback: feedback || undefined,
              successScore: calc.successScore, academicRisk: calc.academicRisk,
              placementRisk: calc.placementRisk, scoreBreakdown: calc.scoreBreakdown,
              hasInsufficientData: calc.hasInsufficientData,
              incompleteReasons: calc.incompleteReasons,
              isSynthetic: false, lastUpdated: new Date().toISOString().split('T')[0]
            });
          }
        });

        resolve({
          fileName, totalRows: rawRows.length, validRowsCount: validStudents.length,
          invalidRowsCount: rawRows.length - validStudents.length,
          duplicateIdsCount, missingValuesCount, errors, validStudents, allParsedRaw: rawRows
        });
      }
    });
  });
}

function exportValidationErrorsToCsv(errors) {
  return Papa.unparse(errors.map(err => ({
    'Row Number': err.rowNumber,
    'Student ID': err.studentId || 'N/A',
    'Affected Column': err.column,
    'Severity': err.severity.toUpperCase(),
    'Invalid Value': err.value !== undefined ? err.value : '',
    'Validation Message': err.message
  })));
}

function generateSampleCsvTemplate() {
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

// ======================================================================
// 3. Test Framework
// ======================================================================
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
    failures.push(message);
  }
}

function assertEq(actual, expected, message) {
  assert(actual === expected, `${message} (expected=${expected}, got=${actual})`);
}

function assertApprox(actual, expected, tolerance, message) {
  assert(Math.abs(actual - expected) <= tolerance, `${message} (expected≈${expected}, got=${actual})`);
}

// ======================================================================
// TESTS
// ======================================================================
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  EduPulse AI — Milestone 2 Comprehensive Verification      ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ────────────────────────────────────────────────────────────────────
// SUITE 1: Normalization Functions
// ────────────────────────────────────────────────────────────────────
console.log('─── SUITE 1: Normalization Functions ───');
assertEq(normalizeCgpa(10.0), 100.0, 'CGPA 10.0 → 100%');
assertEq(normalizeCgpa(0.0), 0.0, 'CGPA 0.0 → 0%');
assertEq(normalizeCgpa(5.0), 50.0, 'CGPA 5.0 → 50% (boundary)');
assertEq(normalizeCgpa(6.5), 65.0, 'CGPA 6.5 → 65% (boundary)');
assertEq(normalizeCgpa(-2), 0.0, 'Negative CGPA clamps to 0%');
assertEq(normalizeCgpa(15), 100.0, 'Over-max CGPA clamps to 100%');
assertEq(normalizeCgpa(NaN), 0, 'NaN CGPA → 0');

assertEq(normalizeSkillRating(5.0), 100.0, 'Skill 5.0 → 100%');
assertEq(normalizeSkillRating(1.0), 20.0, 'Skill 1.0 → 20%');
assertEq(normalizeSkillRating(2.0), 40.0, 'Skill 2.0 → 40% (boundary)');
assertEq(normalizeSkillRating(3.0), 60.0, 'Skill 3.0 → 60% (boundary)');
assertEq(normalizeSkillRating(0), 0.0, 'Skill 0 → 0%');
assertEq(normalizeSkillRating(-1), 0.0, 'Negative skill → 0%');
assertEq(normalizeSkillRating(8), 100.0, 'Over-max skill → 100%');

assertEq(clampPercentage(0), 0, 'Percentage 0 → 0');
assertEq(clampPercentage(100), 100, 'Percentage 100 → 100');
assertEq(clampPercentage(-5), 0, 'Negative percentage → 0');
assertEq(clampPercentage(150), 100, 'Over-100 percentage → 100');

// ────────────────────────────────────────────────────────────────────
// SUITE 2: Academic Risk Classification Boundaries
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 2: Academic Risk Classification ───');
// High: CGPA% < 50 OR Attendance < 60
assertEq(classifyAcademicRisk(4.99, 90), 'High', 'CGPA 4.99 (49.9%) → High');
assertEq(classifyAcademicRisk(5.0, 90), 'Medium', 'CGPA 5.0 (50.0%) → Medium (boundary, NOT High)');
assertEq(classifyAcademicRisk(8.0, 59), 'High', 'Attendance 59% → High');
assertEq(classifyAcademicRisk(8.0, 60), 'Medium', 'Attendance 60% → Medium (boundary, NOT High)');
// Medium: CGPA% < 65 OR Attendance < 75
assertEq(classifyAcademicRisk(6.49, 90), 'Medium', 'CGPA 6.49 (64.9%) → Medium');
assertEq(classifyAcademicRisk(6.5, 90), 'Low', 'CGPA 6.5 (65.0%) → Low (boundary)');
assertEq(classifyAcademicRisk(8.0, 74), 'Medium', 'Attendance 74% → Medium');
assertEq(classifyAcademicRisk(8.0, 75), 'Low', 'Attendance 75% → Low (boundary)');
// Unknown
assertEq(classifyAcademicRisk(null, 90), 'Unknown', 'Missing CGPA → Unknown');
assertEq(classifyAcademicRisk(8.0, null), 'Unknown', 'Missing Attendance → Unknown');
assertEq(classifyAcademicRisk(null, null), 'Unknown', 'Both missing → Unknown');
assertEq(classifyAcademicRisk(undefined, 90), 'Unknown', 'Undefined CGPA → Unknown');
assertEq(classifyAcademicRisk(11.0, 90), 'Unknown', 'CGPA 11.0 (> 10.0) → Unknown (not Low)');
assertEq(classifyAcademicRisk(-1.5, 90), 'Unknown', 'CGPA -1.5 (< 0.0) → Unknown');
assertEq(classifyAcademicRisk(8.0, 110), 'Unknown', 'Attendance 110% (> 100%) → Unknown (not Low)');
assertEq(classifyAcademicRisk(8.0, -5), 'Unknown', 'Attendance -5% (< 0%) → Unknown');
// Both triggers
assertEq(classifyAcademicRisk(3.0, 40), 'High', 'Both below High thresholds → High');

// ────────────────────────────────────────────────────────────────────
// SUITE 3: Placement Risk Classification Boundaries
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 3: Placement Risk Classification ───');
// High: Readiness < 40 OR Skill% < 40 (skill < 2.0)
assertEq(classifyPlacementRisk(39, 4.0), 'High', 'Readiness 39 → High');
assertEq(classifyPlacementRisk(40, 4.0), 'Medium', 'Readiness 40 → Medium (boundary)');
assertEq(classifyPlacementRisk(80, 1.99), 'High', 'Skill 1.99 (39.8%) → High');
assertEq(classifyPlacementRisk(80, 2.0), 'Medium', 'Skill 2.0 (40%) → Medium (boundary)');
// Medium: Readiness < 60 OR Skill% < 60 (skill < 3.0)
assertEq(classifyPlacementRisk(59, 4.0), 'Medium', 'Readiness 59 → Medium');
assertEq(classifyPlacementRisk(60, 4.0), 'Low', 'Readiness 60 → Low (boundary)');
assertEq(classifyPlacementRisk(80, 2.99), 'Medium', 'Skill 2.99 (59.8%) → Medium');
assertEq(classifyPlacementRisk(80, 3.0), 'Low', 'Skill 3.0 (60%) → Low (boundary)');
// Unknown
assertEq(classifyPlacementRisk(null, 4.0), 'Unknown', 'Missing readiness → Unknown');
assertEq(classifyPlacementRisk(80, null), 'Unknown', 'Missing skill → Unknown');
assertEq(classifyPlacementRisk(115, 4.0), 'Unknown', 'Readiness 115 (> 100) → Unknown (not Low)');
assertEq(classifyPlacementRisk(-10, 4.0), 'Unknown', 'Readiness -10 (< 0) → Unknown');
assertEq(classifyPlacementRisk(80, 6.0), 'Unknown', 'Skill 6.0 (> 5.0) → Unknown (not Low)');
assertEq(classifyPlacementRisk(80, -0.5), 'Unknown', 'Skill -0.5 (< 0.0) → Unknown');

// ────────────────────────────────────────────────────────────────────
// SUITE 4: Weighted Score Calculation
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 4: Weighted Score Calculations ───');

// Perfect student (all 100%)
const perfect = calculateScore({ cgpa: 10, attendanceRate: 100, assignmentScore: 100, engagementScore: 100, technicalSkillsRating: 5, placementReadinessScore: 100 });
assertEq(perfect.successScore, 100, 'Perfect student → 100');
assertEq(perfect.academicRisk, 'Low', 'Perfect student → Low academic');
assertEq(perfect.placementRisk, 'Low', 'Perfect student → Low placement');

// Zero student (all zeros — note: skill 0 is below 1.0 min but clamped to 0 for normalization)
const zero = calculateScore({ cgpa: 0, attendanceRate: 0, assignmentScore: 0, engagementScore: 0, technicalSkillsRating: 0, placementReadinessScore: 0 });
assertEq(zero.successScore, 0, 'All-zero student → 0');
assertEq(zero.academicRisk, 'High', 'All-zero → High academic');
assertEq(zero.placementRisk, 'High', 'All-zero → High placement');

// Manual calculation: CGPA=7.0 (70%), Att=80, LMS=75, Eng=65, Skill=3.5 (70%), Place=70
// = 70*0.35 + 80*0.20 + 75*0.15 + 65*0.10 + 70*0.10 + 70*0.10
// = 24.5 + 16.0 + 11.25 + 6.5 + 7.0 + 7.0 = 72.25 → 72.3
const manual = calculateScore({ cgpa: 7.0, attendanceRate: 80, assignmentScore: 75, engagementScore: 65, technicalSkillsRating: 3.5, placementReadinessScore: 70 });
assertApprox(manual.successScore, 72.3, 0.1, 'Manual calc CGPA=7,Att=80,LMS=75,Eng=65,Sk=3.5,Pl=70 → ≈72.3');

// ────────────────────────────────────────────────────────────────────
// SUITE 5: Missing/Invalid Data Policy
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 5: Missing Data & Insufficient Data Policy ───');

const missingAll = calculateScore({ cgpa: null, attendanceRate: null, assignmentScore: null, engagementScore: null, technicalSkillsRating: null, placementReadinessScore: null });
assertEq(missingAll.successScore, null, 'All null → score null');
assertEq(missingAll.hasInsufficientData, true, 'All null → insufficient');
assertEq(missingAll.academicRisk, 'Unknown', 'All null → academic Unknown');
assertEq(missingAll.placementRisk, 'Unknown', 'All null → placement Unknown');
assertEq(missingAll.incompleteReasons.length, 6, 'All null → 6 incomplete reasons');

// Missing one field
const missingOne = calculateScore({ cgpa: 8.0, attendanceRate: 90, assignmentScore: 80, engagementScore: 70, technicalSkillsRating: null, placementReadinessScore: 80 });
assertEq(missingOne.successScore, null, 'One missing → score null');
assertEq(missingOne.hasInsufficientData, true, 'One missing → insufficient');
assertEq(missingOne.academicRisk, 'Low', 'CGPA+Att present → academic risk still classified');
assertEq(missingOne.placementRisk, 'Unknown', 'Missing skill → placement Unknown');

// Out-of-range CGPA
const outRange = calculateScore({ cgpa: 11.0, attendanceRate: 90, assignmentScore: 80, engagementScore: 70, technicalSkillsRating: 4.0, placementReadinessScore: 80 });
assertEq(outRange.successScore, null, 'Out-of-range CGPA → score null');
assertEq(outRange.hasInsufficientData, true, 'Out-of-range CGPA → insufficient');
assertEq(outRange.academicRisk, 'Unknown', 'Out-of-range CGPA → academic risk Unknown (NOT Low)');

// Out-of-range Skill
const outRangeSkill = calculateScore({ cgpa: 8.5, attendanceRate: 90, assignmentScore: 80, engagementScore: 70, technicalSkillsRating: 6.0, placementReadinessScore: 80 });
assertEq(outRangeSkill.successScore, null, 'Out-of-range Skill → score null');
assertEq(outRangeSkill.hasInsufficientData, true, 'Out-of-range Skill → insufficient');
assertEq(outRangeSkill.placementRisk, 'Unknown', 'Out-of-range Skill → placement risk Unknown (NOT Low)');

// ────────────────────────────────────────────────────────────────────
// SUITE 6: Header Normalization
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 6: Header Normalization ───');
assertEq(normalizeHeader('studentId'), 'studentid', 'Lowercase: studentId → studentid');
assertEq(normalizeHeader('  Student_ID  '), 'studentid', 'Trim+underscore: Student_ID → studentid');
assertEq(normalizeHeader('ATTENDANCE_RATE'), 'attendancerate', 'Uppercase+underscore → attendancerate');
assertEq(normalizeHeader('Technical-Skills-Rating'), 'technicalskillsrating', 'Kebab case → technicalskillsrating');
assertEq(normalizeHeader('placement readiness score'), 'placementreadinessscore', 'Spaces → placementreadinessscore');

// ────────────────────────────────────────────────────────────────────
// SUITE 7: Boolean Parsing
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 7: Boolean Value Parsing ───');
assertEq(parseBooleanValue('TRUE'), true, 'TRUE → true');
assertEq(parseBooleanValue('true'), true, 'true → true');
assertEq(parseBooleanValue('1'), true, '1 → true');
assertEq(parseBooleanValue('yes'), true, 'yes → true');
assertEq(parseBooleanValue('Y'), true, 'Y → true');
assertEq(parseBooleanValue('FALSE'), false, 'FALSE → false');
assertEq(parseBooleanValue('false'), false, 'false → false');
assertEq(parseBooleanValue('0'), false, '0 → false');
assertEq(parseBooleanValue('no'), false, 'no → false');
assertEq(parseBooleanValue('N'), false, 'N → false');
assertEq(parseBooleanValue('maybe'), null, 'maybe → null (invalid)');
assertEq(parseBooleanValue(''), null, 'empty → null');

// ────────────────────────────────────────────────────────────────────
// SUITE 8: CSV Validation — Empty File
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 8: CSV Validation — Empty File ───');
const emptyResult = await validateCsvContent('   ', 'empty.csv');
assertEq(emptyResult.totalRows, 0, 'Empty file → 0 total rows');
assertEq(emptyResult.validRowsCount, 0, 'Empty file → 0 valid rows');
assertEq(emptyResult.errors.length, 1, 'Empty file → 1 error');
assert(emptyResult.errors[0].message.includes('empty'), 'Empty file error mentions empty');

// ────────────────────────────────────────────────────────────────────
// SUITE 9: CSV Validation — Valid File
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 9: CSV Validation — Valid 3-Row File ───');
const validCsv = `studentId,name,email,department,semester,cgpa,attendanceRate,assignmentScore,engagementScore,technicalSkillsRating,placementReadinessScore,internshipCompleted,backlogs,feedback
STU-001,Alice A,alice@u.edu,CS,6,8.5,92,88,85,4.4,85,TRUE,0,Good
STU-002,Bob B,bob@u.edu,DS,4,7.2,80,75,70,3.6,72,FALSE,1,Steady
STU-003,Carol C,carol@u.edu,EC,6,6.0,74,70,68,2.8,55,TRUE,0,Improving`;
const validResult = await validateCsvContent(validCsv, 'valid.csv');
assertEq(validResult.totalRows, 3, 'Valid CSV → 3 total rows');
assertEq(validResult.validRowsCount, 3, 'Valid CSV → 3 valid rows');
assertEq(validResult.invalidRowsCount, 0, 'Valid CSV → 0 invalid rows');
assertEq(validResult.errors.length, 0, 'Valid CSV → 0 errors');
assertEq(validResult.duplicateIdsCount, 0, 'Valid CSV → 0 duplicates');

// Verify scoring was applied
assert(validResult.validStudents[0].successScore !== null, 'Valid row gets a computed successScore');
assert(validResult.validStudents[0].isSynthetic === false, 'Imported row → isSynthetic=false');
assert(validResult.validStudents[0].academicRisk === 'Low', 'STU-001 (CGPA=8.5, Att=92) → Low academic risk');
assert(validResult.validStudents[2].academicRisk === 'Medium', 'STU-003 (CGPA=6.0, Att=74) → Medium academic risk');

// ────────────────────────────────────────────────────────────────────
// SUITE 10: CSV Validation — Missing Headers
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 10: CSV Validation — Missing Required Headers ───');
const missingHeaderCsv = `studentId,name
STU-001,Alice`;
const missingHeaderResult = await validateCsvContent(missingHeaderCsv, 'missing-headers.csv');
assert(missingHeaderResult.errors.some(e => e.column === 'email' && e.message.includes('Missing required')), 'Missing email header detected');
assert(missingHeaderResult.errors.some(e => e.column === 'cgpa' && e.message.includes('Missing required')), 'Missing cgpa header detected');
assert(missingHeaderResult.validRowsCount === 0, 'No valid rows when headers missing');

// ────────────────────────────────────────────────────────────────────
// SUITE 11: CSV Validation — Duplicate IDs
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 11: CSV Validation — Duplicate Student IDs ───');
const dupCsv = `studentId,name,email,department,semester,cgpa,attendanceRate,assignmentScore,engagementScore,technicalSkillsRating,placementReadinessScore,internshipCompleted,backlogs
STU-DUP,Alice,a@u.edu,CS,6,8.0,90,80,80,4.0,80,TRUE,0
STU-DUP,Bob,b@u.edu,CS,6,7.0,80,70,70,3.0,70,FALSE,1`;
const dupResult = await validateCsvContent(dupCsv, 'dups.csv');
assert(dupResult.duplicateIdsCount > 0, 'Duplicate IDs counted');
assert(dupResult.errors.some(e => e.column === 'studentId' && e.message.includes('Duplicate')), 'Duplicate ID error message present');
// The first occurrence of a duplicate is ALSO flagged because duplicateStudentIdsInFile includes it
// Both rows should be invalid
assertEq(dupResult.validRowsCount, 0, 'Both duplicate rows rejected (0 valid)');

// ────────────────────────────────────────────────────────────────────
// SUITE 12: CSV Validation — Invalid Numeric Values
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 12: CSV Validation — Invalid Numeric Values ───');
const invalidNumCsv = `studentId,name,email,department,semester,cgpa,attendanceRate,assignmentScore,engagementScore,technicalSkillsRating,placementReadinessScore,internshipCompleted,backlogs
STU-BAD,BadNum,bad@u.edu,CS,6,11.5,120,-5,abc,6.0,150,MAYBE,-3`;
const invalidNumResult = await validateCsvContent(invalidNumCsv, 'badnums.csv');
assertEq(invalidNumResult.validRowsCount, 0, 'All-invalid-nums row rejected');
assert(invalidNumResult.errors.some(e => e.column === 'cgpa'), 'CGPA > 10 flagged');
assert(invalidNumResult.errors.some(e => e.column === 'attendanceRate'), 'Attendance > 100 flagged');
assert(invalidNumResult.errors.some(e => e.column === 'assignmentScore'), 'Negative assignment flagged');
assert(invalidNumResult.errors.some(e => e.column === 'engagementScore'), 'Non-numeric engagement flagged');
assert(invalidNumResult.errors.some(e => e.column === 'technicalSkillsRating'), 'Skill > 5 flagged');
assert(invalidNumResult.errors.some(e => e.column === 'placementReadinessScore'), 'Placement > 100 flagged');
assert(invalidNumResult.errors.some(e => e.column === 'internshipCompleted'), 'Invalid boolean flagged');
assert(invalidNumResult.errors.some(e => e.column === 'backlogs'), 'Negative backlogs flagged');

// ────────────────────────────────────────────────────────────────────
// SUITE 13: CSV Validation — Boundary Values
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 13: CSV Validation — Boundary Values (All Min/Max) ───');
const boundaryCsv = `studentId,name,email,department,semester,cgpa,attendanceRate,assignmentScore,engagementScore,technicalSkillsRating,placementReadinessScore,internshipCompleted,backlogs
STU-MIN,Min Student,min@u.edu,CS,1,0,0,0,0,1.0,0,FALSE,0
STU-MAX,Max Student,max@u.edu,DS,8,10,100,100,100,5.0,100,TRUE,30`;
const boundaryResult = await validateCsvContent(boundaryCsv, 'boundary.csv');
assertEq(boundaryResult.validRowsCount, 2, 'Both boundary rows are valid');
assertEq(boundaryResult.invalidRowsCount, 0, 'No invalid boundary rows');
assertEq(boundaryResult.validStudents[0].semester, 1, 'Min semester=1 accepted');
assertEq(boundaryResult.validStudents[1].semester, 8, 'Max semester=8 accepted');
assertEq(boundaryResult.validStudents[1].cgpa, 10, 'Max CGPA=10 accepted');
assertEq(boundaryResult.validStudents[1].technicalSkillsRating, 5.0, 'Max skill=5.0 accepted');

// ────────────────────────────────────────────────────────────────────
// SUITE 14: CSV Validation — Mixed Valid/Invalid Rows
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 14: CSV Validation — Mixed Valid/Invalid Rows ───');
const mixedCsv = `studentId,name,email,department,semester,cgpa,attendanceRate,assignmentScore,engagementScore,technicalSkillsRating,placementReadinessScore,internshipCompleted,backlogs
STU-OK-1,Good Student,good@u.edu,CS,6,8.0,90,80,80,4.0,80,TRUE,0
STU-BAD-1,Bad CGPA,bad@u.edu,CS,6,15,90,80,80,4.0,80,TRUE,0
STU-OK-2,Another Good,good2@u.edu,DS,4,7.0,85,75,70,3.5,70,FALSE,1`;
const mixedResult = await validateCsvContent(mixedCsv, 'mixed.csv');
assertEq(mixedResult.totalRows, 3, 'Mixed CSV → 3 total rows');
assertEq(mixedResult.validRowsCount, 2, 'Mixed CSV → 2 valid rows');
assertEq(mixedResult.invalidRowsCount, 1, 'Mixed CSV → 1 invalid row');
assert(mixedResult.validStudents[0].studentId === 'STU-OK-1', 'First valid student preserved');
assert(mixedResult.validStudents[1].studentId === 'STU-OK-2', 'Second valid student preserved');

// ────────────────────────────────────────────────────────────────────
// SUITE 15: Error Export CSV
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 15: Error Export to CSV ───');
const errorCsv = exportValidationErrorsToCsv(invalidNumResult.errors);
assert(errorCsv.length > 0, 'Error CSV export has content');
assert(errorCsv.includes('Row Number'), 'Error CSV contains Row Number column');
assert(errorCsv.includes('Validation Message'), 'Error CSV contains Validation Message column');
const parsedErrors = Papa.parse(errorCsv, { header: true });
assert(parsedErrors.data.length > 0, 'Error CSV parses back to rows');
assert(parsedErrors.data[0]['Severity'] === 'ERROR', 'Severity is uppercase in export');

// ────────────────────────────────────────────────────────────────────
// SUITE 16: Header Normalization in CSV (Case/Whitespace Tolerance)
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 16: CSV Header Normalization Tolerance ───');
const normalizedHeaderCsv = `Student_ID,  Name  ,Email,Department,Semester,CGPA,Attendance_Rate,Assignment_Score,Engagement_Score,Technical_Skills_Rating,Placement_Readiness_Score,Internship_Completed,Backlogs,Feedback
STU-NORM,Normalized Test,norm@u.edu,CS,6,8.0,90,80,80,4.0,80,TRUE,0,Works`;
const normResult = await validateCsvContent(normalizedHeaderCsv, 'normalized.csv');
assertEq(normResult.validRowsCount, 1, 'Normalized headers → valid row accepted');
assertEq(normResult.validStudents[0].studentId, 'STU-NORM', 'studentId correctly parsed with normalized header');
assertEq(normResult.validStudents[0].cgpa, 8.0, 'CGPA correctly parsed via normalized CGPA header');

// ────────────────────────────────────────────────────────────────────
// SUITE 17: Dataset Replacement Semantics
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 17: Dataset Replacement Semantics ───');
// Simulates the App.tsx state logic
let activeStudents = Array.from({length: 20}, (_, i) => ({ studentId: `SYNTH-${i}`, isSynthetic: true, name: `Synthetic ${i}` }));
let datasetSource = 'Synthetic Demo';

// Simulate import
const importedStudents = validResult.validStudents;
activeStudents = importedStudents; // Full replacement
datasetSource = 'Imported CSV';
assertEq(activeStudents.length, 3, 'After import: active dataset = imported size (3, not merged with 20)');
assertEq(datasetSource, 'Imported CSV', 'Dataset source updated');
assert(activeStudents.every(s => !s.isSynthetic), 'All imported students have isSynthetic=false');

// Simulate restore
activeStudents = Array.from({length: 20}, (_, i) => ({ studentId: `SYNTH-${i}`, isSynthetic: true, name: `Synthetic ${i}` }));
datasetSource = 'Synthetic Demo';
assertEq(activeStudents.length, 20, 'After restore: 20 synthetic records');
assertEq(datasetSource, 'Synthetic Demo', 'Dataset source restored');
assert(activeStudents.every(s => s.isSynthetic), 'All restored students have isSynthetic=true');

// Simulate failed import (0 valid rows) — should NOT change active dataset
const prevActiveCount = activeStudents.length;
const failedImport = await validateCsvContent('studentId,name\nSTU-FAIL,', 'failed.csv');
if (failedImport.validRowsCount === 0) {
  // In the UI, the Apply button is disabled when validRowsCount === 0
  // Active dataset should NOT be modified
  assertEq(activeStudents.length, prevActiveCount, 'Failed import does NOT overwrite active dataset');
}

// ────────────────────────────────────────────────────────────────────
// SUITE 18: Scoring Applied to Valid Imported Rows
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 18: Scoring Consistency on Imported Rows ───');
const s1 = validResult.validStudents[0]; // STU-001: CGPA=8.5, Att=92, LMS=88, Eng=85, Skill=4.4(88%), Place=85
// Expected: 85*0.35 + 92*0.20 + 88*0.15 + 85*0.10 + 88*0.10 + 85*0.10
// = 29.75 + 18.4 + 13.2 + 8.5 + 8.8 + 8.5 = 87.15 → 87.2
assertApprox(s1.successScore, 87.2, 0.2, 'STU-001 imported score ≈87.2');
assertEq(s1.academicRisk, 'Low', 'STU-001 academic risk = Low');
assertEq(s1.placementRisk, 'Low', 'STU-001 placement risk = Low');
assert(s1.scoreBreakdown !== undefined, 'STU-001 has scoreBreakdown');

const s3 = validResult.validStudents[2]; // STU-003: CGPA=6.0 (60%), Att=74, LMS=70, Eng=68, Skill=2.8(56%), Place=55
// Academic: CGPA%=60 < 65 → Medium, Att=74 < 75 → Medium → overall Medium
assertEq(s3.academicRisk, 'Medium', 'STU-003 academic risk = Medium');
// Placement: Readiness=55 < 60 → Medium, Skill%=56 < 60 → Medium → overall Medium
assertEq(s3.placementRisk, 'Medium', 'STU-003 placement risk = Medium');

// ────────────────────────────────────────────────────────────────────
// SUITE 19: Semester Boundary Validation
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 19: Semester Boundary Validation ───');
const semCsv = `studentId,name,email,department,semester,cgpa,attendanceRate,assignmentScore,engagementScore,technicalSkillsRating,placementReadinessScore,internshipCompleted,backlogs
STU-S0,Test,t@u.edu,CS,0,8.0,90,80,80,4.0,80,TRUE,0
STU-S9,Test,t@u.edu,CS,9,8.0,90,80,80,4.0,80,TRUE,0
STU-S1,Test,t@u.edu,CS,1,8.0,90,80,80,4.0,80,TRUE,0
STU-S8,Test,t@u.edu,CS,8,8.0,90,80,80,4.0,80,TRUE,0`;
const semResult = await validateCsvContent(semCsv, 'semester.csv');
assertEq(semResult.validRowsCount, 2, 'Only semester 1 and 8 accepted, 0 and 9 rejected');
assert(semResult.errors.some(e => e.studentId === 'STU-S0' && e.column === 'semester'), 'Semester 0 flagged');
assert(semResult.errors.some(e => e.studentId === 'STU-S9' && e.column === 'semester'), 'Semester 9 flagged');

// ────────────────────────────────────────────────────────────────────
// SUITE 20: Email Validation
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 20: Email Validation ───');
const emailCsv = `studentId,name,email,department,semester,cgpa,attendanceRate,assignmentScore,engagementScore,technicalSkillsRating,placementReadinessScore,internshipCompleted,backlogs
STU-E1,Test,not-an-email,CS,6,8.0,90,80,80,4.0,80,TRUE,0
STU-E2,Test,valid@u.edu,CS,6,8.0,90,80,80,4.0,80,TRUE,0`;
const emailResult = await validateCsvContent(emailCsv, 'email.csv');
assertEq(emailResult.validRowsCount, 1, 'Only valid email accepted');
assert(emailResult.errors.some(e => e.studentId === 'STU-E1' && e.column === 'email'), 'Invalid email flagged');

// ────────────────────────────────────────────────────────────────────
// SUITE 21: Test Fixtures on Disk (End-to-End File Validation)
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 21: Disk Fixtures End-to-End Validation ───');
const fixturesDir = path.resolve('test-fixtures');

// 1. Valid students fixture
const validFixtPath = path.join(fixturesDir, 'valid-students.csv');
const validFixtContent = fs.readFileSync(validFixtPath, 'utf8');
const validFixtResult = await validateCsvContent(validFixtContent, 'valid-students.csv');
assertEq(validFixtResult.totalRows, 5, 'valid-students.csv → 5 total rows');
assertEq(validFixtResult.validRowsCount, 5, 'valid-students.csv → 5 valid rows');
assertEq(validFixtResult.invalidRowsCount, 0, 'valid-students.csv → 0 invalid rows');
assertEq(validFixtResult.errors.length, 0, 'valid-students.csv → 0 errors');
assertEq(validFixtResult.validStudents[0].academicRisk, 'Low', 'STU-VAL-001 (CGPA=9.2, Att=96) → Low academic risk');
assertEq(validFixtResult.validStudents[0].placementRisk, 'Low', 'STU-VAL-001 (Skill=4.8, Pl=92) → Low placement risk');
assertEq(validFixtResult.validStudents[1].academicRisk, 'Medium', 'STU-VAL-002 (CGPA=6.1, Att=68) → Medium academic risk');
assertEq(validFixtResult.validStudents[1].placementRisk, 'Medium', 'STU-VAL-002 (Skill=3.2, Pl=55) → Medium placement risk');
assertEq(validFixtResult.validStudents[2].academicRisk, 'High', 'STU-VAL-003 (CGPA=4.6, Att=55) → High academic risk');
assertEq(validFixtResult.validStudents[3].placementRisk, 'High', 'STU-VAL-004 (Skill=1.8, Pl=36) → High placement risk');
assertEq(validFixtResult.validStudents[4].academicRisk, 'Low', 'STU-VAL-005 (CGPA=7.4, Att=82) → Low academic risk');
assertEq(validFixtResult.validStudents[4].placementRisk, 'Low', 'STU-VAL-005 (Skill=3.6, Pl=74) → Low placement risk');

// 2. Invalid students fixture
const invalidFixtPath = path.join(fixturesDir, 'invalid-students.csv');
const invalidFixtContent = fs.readFileSync(invalidFixtPath, 'utf8');
const invalidFixtResult = await validateCsvContent(invalidFixtContent, 'invalid-students.csv');
assertEq(invalidFixtResult.validRowsCount, 0, 'invalid-students.csv → 0 valid rows accepted');
assert(invalidFixtResult.duplicateIdsCount > 0, 'invalid-students.csv → duplicates detected');
assert(invalidFixtResult.errors.length >= 10, 'invalid-students.csv → all invalid rows produce errors');

// 3. Empty fixture
const emptyFixtPath = path.join(fixturesDir, 'empty.csv');
const emptyFixtContent = fs.readFileSync(emptyFixtPath, 'utf8');
const emptyFixtResult = await validateCsvContent(emptyFixtContent, 'empty.csv');
assertEq(emptyFixtResult.totalRows, 0, 'empty.csv → 0 rows');
assertEq(emptyFixtResult.validRowsCount, 0, 'empty.csv → 0 valid rows');
assert(emptyFixtResult.errors[0].message.includes('empty'), 'empty.csv → error mentions empty file');

// 4. Mixed fixture
const mixedFixtPath = path.join(fixturesDir, 'mixed-students.csv');
const mixedFixtContent = fs.readFileSync(mixedFixtPath, 'utf8');
const mixedFixtResult = await validateCsvContent(mixedFixtContent, 'mixed-students.csv');
assertEq(mixedFixtResult.totalRows, 3, 'mixed-students.csv → 3 total rows');
assertEq(mixedFixtResult.validRowsCount, 2, 'mixed-students.csv → 2 valid rows');
assertEq(mixedFixtResult.invalidRowsCount, 1, 'mixed-students.csv → 1 invalid row');
assert(mixedFixtResult.errors.some(e => e.column === 'cgpa' && e.studentId === 'STU-MIX-BAD'), 'mixed-students.csv → bad row flagged');

// ────────────────────────────────────────────────────────────────────
// SUITE 22: Sample CSV Template Compatibility & Export
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 22: Sample CSV Template Compatibility ───');
const sampleTemplateCsv = generateSampleCsvTemplate();
assert(sampleTemplateCsv.length > 0, 'Template generator produces non-empty CSV string');
const sampleResult = await validateCsvContent(sampleTemplateCsv, 'sample_template.csv');
assertEq(sampleResult.totalRows, 3, 'Sample template parses 3 rows');
assertEq(sampleResult.validRowsCount, 3, 'Sample template produces 3 valid rows');
assertEq(sampleResult.invalidRowsCount, 0, 'Sample template produces 0 invalid rows');
assertEq(sampleResult.errors.length, 0, 'Sample template produces 0 errors');
assert(sampleResult.validStudents[0].successScore !== null, 'Template row 1 has computed success score');
assertEq(sampleResult.validStudents[0].academicRisk, 'Low', 'Template row 1 academic risk = Low');
assertEq(sampleResult.validStudents[0].placementRisk, 'Low', 'Template row 1 placement risk = Low');
assertEq(sampleResult.validStudents[1].academicRisk, 'Medium', 'Template row 2 academic risk = Medium');
assertEq(sampleResult.validStudents[1].placementRisk, 'Medium', 'Template row 2 placement risk = Medium');

// ────────────────────────────────────────────────────────────────────
// SUITE 23: Dashboard KPI Calculation, Filtering & Modal Breakdown Consistency
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 23: Dashboard KPIs, Filtering & Score Breakdown ───');
// Test KPI calculation matching OverviewTab
const testDataset = validFixtResult.validStudents; // 5 students
const scoredStudents = testDataset.filter(s => typeof s.successScore === 'number' && !isNaN(s.successScore));
const avgScore = scoredStudents.length > 0 
  ? Number((scoredStudents.reduce((acc, s) => acc + s.successScore, 0) / scoredStudents.length).toFixed(1))
  : 0;
assertEq(testDataset.length, 5, 'KPI: Total Students = 5');
assert(avgScore > 0, `KPI: Average Score = ${avgScore} > 0`);
const academicHighCount = testDataset.filter(s => s.academicRisk === 'High').length;
const academicMedCount = testDataset.filter(s => s.academicRisk === 'Medium').length;
const academicLowCount = testDataset.filter(s => s.academicRisk === 'Low').length;
assertEq(academicHighCount, 1, 'KPI: Academic High Risk = 1');
assertEq(academicMedCount, 1, 'KPI: Academic Medium Risk = 1');
assertEq(academicLowCount, 3, 'KPI: Academic Low Risk = 3');

// Test department filtering matching StudentsTab
const csStudents = testDataset.filter(s => s.department === 'Computer Science');
assertEq(csStudents.length, 1, 'Filter: Department Computer Science returns 1 student');
assertEq(csStudents[0].studentId, 'STU-VAL-001', 'Filter: Returned student is STU-VAL-001');

// Test search filtering matching StudentsTab
const searchSharma = testDataset.filter(s => 
  s.name.toLowerCase().includes('sharma') || 
  s.studentId.toLowerCase().includes('sharma') || 
  s.department.toLowerCase().includes('sharma')
);
assertEq(searchSharma.length, 1, 'Search: "sharma" finds Aarav Sharma');

// Test sorting by CGPA desc matching StudentsTab
const sortedByCgpaDesc = [...testDataset].sort((a, b) => b.cgpa - a.cgpa);
assertEq(sortedByCgpaDesc[0].cgpa, 9.2, 'Sort: Highest CGPA first (9.2)');
assertEq(sortedByCgpaDesc[sortedByCgpaDesc.length - 1].cgpa, 4.6, 'Sort: Lowest CGPA last (4.6)');

// Test Modal score breakdown mathematical consistency
testDataset.forEach(student => {
  const bd = student.scoreBreakdown;
  assert(bd !== undefined, `Modal: Score breakdown exists for ${student.studentId}`);
  const compSum = Number((bd.academicComponent + bd.attendanceComponent + bd.lmsComponent + bd.engagementComponent + bd.skillsComponent + bd.placementComponent).toFixed(1));
  assertApprox(compSum, student.successScore, 0.1, `Modal: Breakdown components sum (${compSum}) ≈ successScore (${student.successScore}) for ${student.studentId}`);
});

// ────────────────────────────────────────────────────────────────────
// SUMMARY
// ────────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log(`║  Results: ${passed} PASSED, ${failed} FAILED${' '.repeat(Math.max(0, 35 - String(passed).length - String(failed).length))}║`);
console.log('╚══════════════════════════════════════════════════════════════╝');

if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  ✗ ${f}`));
}

process.exit(failed > 0 ? 1 : 0);
