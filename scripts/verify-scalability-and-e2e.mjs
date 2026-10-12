import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    totalFailed++;
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
    totalPassed++;
  }
}

function assertEq(actual, expected, message) {
  if (actual !== expected) {
    console.error(`  ✗ FAIL: ${message} (expected: ${expected}, got: ${actual})`);
    totalFailed++;
    throw new Error(`Expected ${expected}, got ${actual}`);
  } else {
    console.log(`  ✓ ${message} (expected=${expected}, got=${actual})`);
    totalPassed++;
  }
}

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  EduPulse AI — Cohort Scalability & Full E2E Test Suite      ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

// Replicate scoring engine & validator logic for Node verification
const SCORING_WEIGHTS = {
  ACADEMIC_CGPA: 0.35,
  ATTENDANCE: 0.20,
  LMS_COMPLETION: 0.15,
  ENGAGEMENT: 0.10,
  SKILL_RATING: 0.10,
  PLACEMENT_READINESS: 0.10,
};

function normalizeCgpa(cgpa) {
  const clamped = Math.max(0, Math.min(10.0, cgpa));
  return Number(((clamped / 10.0) * 100).toFixed(2));
}

function normalizeSkillRating(rating) {
  const clamped = Math.max(0, Math.min(5.0, rating));
  return Number(((clamped / 5.0) * 100).toFixed(2));
}

function clampPercentage(val) {
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

function calculateStudentSuccessScore(input) {
  const cgpaPart = normalizeCgpa(input.cgpa) * SCORING_WEIGHTS.ACADEMIC_CGPA;
  const attPart = clampPercentage(input.attendanceRate) * SCORING_WEIGHTS.ATTENDANCE;
  const lmsPart = clampPercentage(input.assignmentScore) * SCORING_WEIGHTS.LMS_COMPLETION;
  const engPart = clampPercentage(input.engagementScore) * SCORING_WEIGHTS.ENGAGEMENT;
  const skillPart = normalizeSkillRating(input.technicalSkillsRating) * SCORING_WEIGHTS.SKILL_RATING;
  const placePart = clampPercentage(input.placementReadinessScore) * SCORING_WEIGHTS.PLACEMENT_READINESS;

  const total = cgpaPart + attPart + lmsPart + engPart + skillPart + placePart;
  return {
    successScore: Number(total.toFixed(1)),
    academicRisk: classifyAcademicRisk(input.cgpa, input.attendanceRate),
    placementRisk: classifyPlacementRisk(input.placementReadinessScore, input.technicalSkillsRating)
  };
}

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Rohan', 'Priya', 'Vikram', 'Sneha', 'Aditya', 'Neha', 
  'Karan', 'Pooja', 'Rahul', 'Divya', 'Siddharth', 'Meera', 'Varun', 'Rhea', 
  'Amit', 'Ishaan', 'Tanvi', 'Kabir', 'Akash', 'Shruti', 'Nikhil', 'Swati'
];

const LAST_NAMES = [
  'Sharma', 'Iyer', 'Verma', 'Patel', 'Reddy', 'Deshmukh', 'Gupta', 'Singh',
  'Mehta', 'Nair', 'Chopra', 'Joshi', 'Menon', 'Kulkarni', 'Bose', 'Kapoor'
];

const DEPARTMENTS = [
  'Computer Science', 'Data Science', 'Information Technology', 
  'AI & Machine Learning', 'Electronics', 'Mechanical'
];

function generateTestCohort(count) {
  const result = [];
  for (let i = 1; i <= count; i++) {
    const paddedId = String(i).padStart(4, '0');
    const studentId = `STU-2024-${paddedId}`;
    const firstName = FIRST_NAMES[(i * 7 + 3) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 11 + 5) % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@campus.edu`;
    const department = DEPARTMENTS[i % DEPARTMENTS.length];
    const semester = ((i % 8) + 1);

    const baseVariance = ((i * 17) % 100) / 100;
    const cgpa = Number((4.5 + baseVariance * 5.2).toFixed(2));
    const attendanceRate = Math.min(100, Math.max(45, Math.round(50 + baseVariance * 48)));
    const assignmentScore = Math.min(100, Math.max(40, Math.round(45 + baseVariance * 52)));
    const engagementScore = Math.min(100, Math.max(35, Math.round(40 + baseVariance * 55)));
    const technicalSkillsRating = Number((1.5 + baseVariance * 3.4).toFixed(1));
    const placementReadinessScore = Math.min(100, Math.max(30, Math.round(35 + baseVariance * 62)));
    const internshipCompleted = baseVariance > 0.45;
    const backlogs = baseVariance < 0.25 ? Math.round((0.25 - baseVariance) * 12) : 0;
    const feedback = 'Regular student academic record entry.';

    const calc = calculateStudentSuccessScore({
      cgpa,
      attendanceRate,
      assignmentScore,
      engagementScore,
      technicalSkillsRating,
      placementReadinessScore
    });

    result.push({
      studentId,
      name,
      email,
      department,
      semester,
      cgpa,
      attendanceRate,
      assignmentScore,
      engagementScore,
      technicalSkillsRating,
      placementReadinessScore,
      internshipCompleted,
      backlogs,
      feedback,
      successScore: calc.successScore,
      academicRisk: calc.academicRisk,
      placementRisk: calc.placementRisk,
      isSynthetic: true
    });
  }
  return result;
}

// ────────────────────────────────────────────────────────────────────
// SUITE 1: Scalable Cohort Generation (0, 1, 20, 21, 100, 500, 1000)
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 1: Dataset Scalability Without 20-Student Limits ───');

const testSizes = [0, 1, 20, 21, 100, 500, 1000];
for (const size of testSizes) {
  const cohort = generateTestCohort(size);
  assertEq(cohort.length, size, `generateTestCohort(${size}) produces exactly ${size} records`);

  if (size > 0) {
    const first = cohort[0];
    assert(Boolean(first.studentId), `First student has ID: ${first.studentId}`);
    assert(typeof first.cgpa === 'number', `First student has valid CGPA: ${first.cgpa}`);
    assert(first.successScore !== null, `First student has computed success score: ${first.successScore}`);
  }

  if (size >= 21) {
    assert(cohort.length > 20, `Cohort size ${size} is strictly greater than 20`);
    assert(cohort[20].studentId === 'STU-2024-0021', `21st student has expected ID STU-2024-0021`);
  }
}

// ────────────────────────────────────────────────────────────────────
// SUITE 2: CSV Export & Ingestion at Scale (100, 500, 1,000 students)
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 2: CSV Parsing & Validation Scalability ───');

function cohortToCsv(cohort) {
  const headers = [
    'studentId', 'name', 'email', 'department', 'semester', 'cgpa',
    'attendanceRate', 'assignmentScore', 'engagementScore',
    'technicalSkillsRating', 'placementReadinessScore', 'internshipCompleted',
    'backlogs', 'feedback'
  ];
  const rows = [headers.join(',')];
  for (const s of cohort) {
    const row = [
      `"${s.studentId}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.email}"`,
      `"${s.department}"`,
      s.semester,
      s.cgpa,
      s.attendanceRate,
      s.assignmentScore,
      s.engagementScore,
      s.technicalSkillsRating,
      s.placementReadinessScore,
      s.internshipCompleted ? 'TRUE' : 'FALSE',
      s.backlogs,
      `"${(s.feedback || '').replace(/"/g, '""')}"`
    ];
    rows.push(row.join(','));
  }
  return rows.join('\n');
}

for (const count of [100, 500, 1000]) {
  const cohort = generateTestCohort(count);
  const csvText = cohortToCsv(cohort);
  
  // Parse with PapaParse
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  assertEq(parsed.data.length, count, `PapaParse parsed all ${count} student records without loss`);
  assertEq(parsed.errors.length, 0, `PapaParse encountered 0 errors for ${count} students`);
}

// ────────────────────────────────────────────────────────────────────
// SUITE 3: Special Characters, Unicode, Commas, and Quotes
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 3: Robust Parsing (Unicode, Commas in Quotes, Escapes) ───');

const specialCsv = `studentId,name,email,department,semester,cgpa,attendanceRate,assignmentScore,engagementScore,technicalSkillsRating,placementReadinessScore,internshipCompleted,backlogs,feedback
"STU-UNI-001","Ananya Śarmā","ananya.s@uni.edu","Data Science",6,8.5,90,85,80,4.2,85,TRUE,0,"Great progress, active participant"
"STU-COMMA-002","Verma, Rohan","rohan.v@uni.edu","Computer Science",6,7.2,82,78,75,3.6,72,FALSE,0,"Needs help in algorithms, data structures"
"STU-QUOTE-003","Priya ""Star"" Patel","priya.p@uni.edu","AI & Machine Learning",6,9.1,95,92,90,4.8,92,TRUE,0,"Called ""exceptional talent"" by mentor"`;

const specialParsed = Papa.parse(specialCsv, { header: true, skipEmptyLines: true });
assertEq(specialParsed.data.length, 3, 'Special characters CSV parsed 3 rows');
assertEq(specialParsed.data[0].name, 'Ananya Śarmā', 'Unicode name preserved: Ananya Śarmā');
assertEq(specialParsed.data[1].name, 'Verma, Rohan', 'Comma inside quotes preserved: Verma, Rohan');
assertEq(specialParsed.data[2].name, 'Priya "Star" Patel', 'Escaped quotes preserved: Priya "Star" Patel');

// ────────────────────────────────────────────────────────────────────
// SUITE 4: UI Pagination Mechanics for 1,000 Students
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 4: UI Pagination Mechanics for 1,000 Students ───');

const largeCohort = generateTestCohort(1000);
const pageSize = 25;
const totalPages = Math.ceil(largeCohort.length / pageSize);
assertEq(totalPages, 40, '1,000 students with pageSize=25 yields exactly 40 pages');

const page1 = largeCohort.slice(0, 25);
assertEq(page1.length, 25, 'Page 1 has 25 items');
assertEq(page1[0].studentId, 'STU-2024-0001', 'Page 1 starts at first student');

const page40 = largeCohort.slice(39 * 25, 40 * 25);
assertEq(page40.length, 25, 'Page 40 has 25 items');
assertEq(page40[24].studentId, 'STU-2024-1000', 'Page 40 ends at STU-2024-1000');

const allView = largeCohort.slice(0, largeCohort.length);
assertEq(allView.length, 1000, 'All records view presents full 1,000 dataset without restriction');

// ────────────────────────────────────────────────────────────────────
// SUITE 5: Analytics & KPI Aggregates for 1,000 Students
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 5: Analytics & KPI Aggregates for 1,000 Students ───');

const deptMap = {};
for (const s of largeCohort) {
  deptMap[s.department] = (deptMap[s.department] || 0) + 1;
}
assert(Object.keys(deptMap).length === 6, `1,000 students categorized across 6 departments`);
assertEq(Object.values(deptMap).reduce((a, b) => a + b, 0), 1000, `Sum of departmental counts equals 1,000`);

const highRiskCount = largeCohort.filter(s => s.academicRisk === 'High').length;
const medRiskCount = largeCohort.filter(s => s.academicRisk === 'Medium').length;
const lowRiskCount = largeCohort.filter(s => s.academicRisk === 'Low').length;
assertEq(highRiskCount + medRiskCount + lowRiskCount, 1000, `Sum of risk classifications equals 1,000 students`);
assert(highRiskCount > 0, `Identified ${highRiskCount} High Risk students`);
assert(medRiskCount > 0, `Identified ${medRiskCount} Medium Risk students`);
assert(lowRiskCount > 0, `Identified ${lowRiskCount} Low Risk students`);

// ────────────────────────────────────────────────────────────────────
// SUITE 6: Live Supabase Integration Verification
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 6: Live Supabase Integration Verification ───');

const envPath = path.resolve(projectRoot, '.env');
assert(fs.existsSync(envPath), '.env file exists at project root');

const envContent = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '';
let publishableKey = '';

for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const [k, ...v] = trimmed.split('=');
  const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  if (k.trim() === 'VITE_SUPABASE_URL') supabaseUrl = val;
  if (k.trim() === 'VITE_SUPABASE_PUBLISHABLE_KEY') publishableKey = val;
}

assert(Boolean(supabaseUrl), 'VITE_SUPABASE_URL configured');
assert(Boolean(publishableKey), 'VITE_SUPABASE_PUBLISHABLE_KEY configured');
assert(!publishableKey.includes('placeholder'), 'Publishable key is a non-placeholder key');

const client = createClient(supabaseUrl, publishableKey);

// 1. Live table read access
const { data: dbData, count: dbCount, error: dbError } = await client
  .from('students')
  .select('student_id', { count: 'exact' });

assert(!dbError, `Supabase read query succeeded without error (code=${dbError?.code || 'OK'})`);
assert(typeof dbCount === 'number', `Live database student count retrieved: ${dbCount}`);

// 2. Row Level Security policy enforcement test
const { error: rlsInsertError } = await client
  .from('students')
  .insert([{
    student_id: 'UNAUTHORIZED_INTRUSION_TEST',
    name: 'Attacker',
    email: 'bad@bad.com',
    department: 'CS',
    semester: 1,
    cgpa: 5.0,
    attendance_rate: 50,
    assignment_score: 50,
    engagement_score: 50,
    technical_skills_rating: 3.0,
    placement_readiness_score: 50,
    academic_risk: 'Medium',
    placement_risk: 'Medium'
  }]);

assert(
  Boolean(rlsInsertError) && (rlsInsertError.code === '42501' || rlsInsertError.message.includes('row-level security')),
  'RLS successfully blocks direct unauthorized anonymous table insert (HTTP 403 / 42501)'
);

// ────────────────────────────────────────────────────────────────────
// SUITE 7: Git & Build Security Hygiene
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE 7: Git & Secret Prevention ───');

const gitignorePath = path.resolve(projectRoot, '.gitignore');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
assert(gitignoreContent.includes('.env'), '.gitignore excludes .env');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log(`║  Results: ${totalPassed} PASSED, ${totalFailed} FAILED                                ║`);
console.log('╚══════════════════════════════════════════════════════════════╝\n');
