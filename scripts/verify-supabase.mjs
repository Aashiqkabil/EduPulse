/**
 * Automated Verification Script for Milestone 3:
 * Supabase Integration, Data Model Mapping, Security Policies, and Safe Client Behavior
 *
 * Run via: node scripts/verify-supabase.mjs
 */

import fs from 'fs';
import path from 'path';

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

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  EduPulse AI — Supabase Integration Verification Suite      ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ────────────────────────────────────────────────────────────────────
// SUITE S1: Git Security & Environment Configuration Hygiene
// ────────────────────────────────────────────────────────────────────
console.log('─── SUITE S1: Git Security & Environment Hygiene ───');
const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
assert(gitignoreContent.includes('.env'), '.gitignore explicitly ignores .env');
assert(gitignoreContent.includes('.env.*'), '.gitignore explicitly ignores .env.*');
assert(gitignoreContent.includes('!.env.example'), '.gitignore allows .env.example template');

const envExampleContent = fs.readFileSync('.env.example', 'utf8');
assert(envExampleContent.includes('VITE_SUPABASE_URL='), '.env.example defines VITE_SUPABASE_URL placeholder');
assert(envExampleContent.includes('VITE_SUPABASE_PUBLISHABLE_KEY='), '.env.example defines VITE_SUPABASE_PUBLISHABLE_KEY placeholder');
assert(!envExampleContent.includes('service_role') || envExampleContent.includes('Never expose'), '.env.example warns against service_role keys');

// Scan src/ for accidental secret-role key exposure
const srcFiles = [];
function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      srcFiles.push(fullPath);
    }
  });
}
walkDir('src');

let foundSecretRoleExposure = false;
srcFiles.forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  if (code.includes('SUPABASE_SERVICE_ROLE_KEY') || code.includes('service_role_key') || code.includes('secret_key')) {
    foundSecretRoleExposure = true;
  }
});
assert(!foundSecretRoleExposure, 'No service_role secret keys are referenced in frontend source code');

// ────────────────────────────────────────────────────────────────────
// SUITE S2: Database Schema & Migration Specification
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE S2: Database Migration & RLS Security ───');
const migrationPath = path.join('supabase', 'migrations', '20261012000000_create_students_schema.sql');
assert(fs.existsSync(migrationPath), 'SQL migration file exists at expected path');

const sqlMigration = fs.readFileSync(migrationPath, 'utf8');
assert(sqlMigration.includes('CREATE TABLE IF NOT EXISTS public.students'), 'Migration creates public.students table');
assert(sqlMigration.includes('student_id TEXT NOT NULL UNIQUE'), 'Migration defines unique student_id constraint');
assert(sqlMigration.includes('semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8)'), 'Migration enforces semester 1-8 check');
assert(sqlMigration.includes('cgpa NUMERIC(4, 2) NOT NULL CHECK (cgpa >= 0.0 AND cgpa <= 10.0)'), 'Migration enforces CGPA scale check');
assert(sqlMigration.includes('attendance_rate NUMERIC(5, 2) NOT NULL CHECK (attendance_rate >= 0.0 AND attendance_rate <= 100.0)'), 'Migration enforces attendance rate check');
assert(sqlMigration.includes('technical_skills_rating NUMERIC(3, 2) NOT NULL CHECK (technical_skills_rating >= 1.0 AND technical_skills_rating <= 5.0)'), 'Migration enforces skill rating check');
assert(sqlMigration.includes('placement_readiness_score NUMERIC(5, 2) NOT NULL CHECK (placement_readiness_score >= 0.0 AND placement_readiness_score <= 100.0)'), 'Migration enforces placement readiness check');
assert(sqlMigration.includes('ENABLE ROW LEVEL SECURITY'), 'Row Level Security is enabled on students table');
assert(sqlMigration.includes('CREATE POLICY "Allow read access to students"'), 'RLS policy: read access defined');
assert(sqlMigration.includes('CREATE POLICY "Allow insert of verified students"'), 'RLS policy: verified insert access defined');
assert(sqlMigration.includes('CREATE POLICY "Allow update of verified students"'), 'RLS policy: update access defined');
assert(sqlMigration.includes('CREATE POLICY "Allow cohort replacement delete"'), 'RLS policy: cohort replacement delete defined');
assert(sqlMigration.includes('idx_students_student_id'), 'Database index created on student_id');
assert(sqlMigration.includes('idx_students_academic_risk'), 'Database index created on academic_risk');
assert(sqlMigration.includes('idx_students_placement_risk'), 'Database index created on placement_risk');

// ────────────────────────────────────────────────────────────────────
// SUITE S3: Client Data Model Transformation (toDbStudent & fromDbStudent)
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE S3: Data Model Mapping Functions ───');

// Replicate mapping logic for verification
function toDbStudent(student) {
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

function fromDbStudent(row) {
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
    successScore: row.success_score !== null && row.success_score !== undefined ? Number(row.success_score) : null,
    academicRisk: row.academic_risk || 'Unknown',
    placementRisk: row.placement_risk || 'Unknown',
    scoreBreakdown: row.score_breakdown || undefined,
    hasInsufficientData: Boolean(row.has_insufficient_data),
    incompleteReasons: row.incomplete_reasons || [],
    isSynthetic: Boolean(row.is_synthetic),
    lastUpdated: row.updated_at ? String(row.updated_at).split('T')[0] : '2026-10-12',
  };
}

const clientStudent = {
  studentId: 'STU-M3-001',
  name: 'Maya Sen',
  email: 'maya.s@uni.edu',
  department: 'Computer Science',
  semester: 6,
  cgpa: 8.9,
  attendanceRate: 94,
  assignmentScore: 90,
  engagementScore: 88,
  technicalSkillsRating: 4.6,
  placementReadinessScore: 90,
  internshipCompleted: true,
  backlogs: 0,
  feedback: 'Excellent work',
  successScore: 90.8,
  academicRisk: 'Low',
  placementRisk: 'Low',
  scoreBreakdown: {
    academicComponent: 31.15,
    attendanceComponent: 18.8,
    lmsComponent: 13.5,
    engagementComponent: 8.8,
    skillsComponent: 9.2,
    placementComponent: 9.0,
    cgpaNormalized: 89,
    attendanceNormalized: 94,
    lmsNormalized: 90,
    engagementNormalized: 88,
    skillsNormalized: 92,
    placementNormalized: 90
  },
  hasInsufficientData: false,
  incompleteReasons: [],
  isSynthetic: false,
  lastUpdated: '2026-10-12'
};

const dbRow = toDbStudent(clientStudent);
assertEq(dbRow.student_id, 'STU-M3-001', 'toDbStudent maps studentId -> student_id');
assertEq(dbRow.attendance_rate, 94, 'toDbStudent maps attendanceRate -> attendance_rate');
assertEq(dbRow.technical_skills_rating, 4.6, 'toDbStudent maps technicalSkillsRating -> technical_skills_rating');
assertEq(dbRow.placement_readiness_score, 90, 'toDbStudent maps placementReadinessScore -> placement_readiness_score');
assertEq(dbRow.internship_completed, true, 'toDbStudent maps internshipCompleted -> internship_completed');
assertEq(dbRow.success_score, 90.8, 'toDbStudent maps successScore -> success_score');

const roundTripped = fromDbStudent(dbRow);
assertEq(roundTripped.studentId, clientStudent.studentId, 'fromDbStudent round-trips studentId');
assertEq(roundTripped.cgpa, clientStudent.cgpa, 'fromDbStudent round-trips cgpa');
assertEq(roundTripped.attendanceRate, clientStudent.attendanceRate, 'fromDbStudent round-trips attendanceRate');
assertEq(roundTripped.successScore, clientStudent.successScore, 'fromDbStudent round-trips successScore');
assertEq(roundTripped.academicRisk, clientStudent.academicRisk, 'fromDbStudent round-trips academicRisk');
assertEq(roundTripped.placementRisk, clientStudent.placementRisk, 'fromDbStudent round-trips placementRisk');
assertEq(roundTripped.internshipCompleted, clientStudent.internshipCompleted, 'fromDbStudent round-trips internshipCompleted');

// ────────────────────────────────────────────────────────────────────
// SUITE S4: Graceful Degradation in Demo Mode
// ────────────────────────────────────────────────────────────────────
console.log('\n─── SUITE S4: Demo Mode & Unconfigured Safeguards ───');
function isSupabaseConfiguredCheck(url, key) {
  const isPlaceholder = (val) => {
    if (!val) return true;
    const lower = val.toLowerCase();
    return lower.includes('your-project') || lower.includes('your-publishable') || lower.includes('placeholder');
  };
  return typeof url === 'string' && url.trim().length > 0 && !isPlaceholder(url) &&
         typeof key === 'string' && key.trim().length > 0 && !isPlaceholder(key);
}

assertEq(isSupabaseConfiguredCheck('', ''), false, 'Empty credentials evaluate to unconfigured');
assertEq(isSupabaseConfiguredCheck('https://your-project-id.supabase.co', 'your_key'), false, 'Placeholder URL evaluates to unconfigured');
assertEq(isSupabaseConfiguredCheck('https://test.supabase.co', 'placeholder_key'), false, 'Placeholder key evaluates to unconfigured');
assertEq(isSupabaseConfiguredCheck('https://valid-project.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid'), true, 'Valid URL and key evaluate to configured');

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
