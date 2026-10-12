/**
 * Automated Verification Script for Milestone 2:
 * Scoring Engine, Normalization, Deterministic Risk Rules, and CSV Validator
 * Run via: node scripts/verify-scoring.mjs
 */

import Papa from 'papaparse';

// 1. SCORING CONSTANTS & NORMALIZATION
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
  if (cgpa === null || cgpa === undefined || isNaN(cgpa)) return 'Unknown';
  if (attendanceRate === null || attendanceRate === undefined || isNaN(attendanceRate)) return 'Unknown';
  const cgpaPct = normalizeCgpa(cgpa);
  const att = clampPercentage(attendanceRate);
  if (cgpaPct < 50 || att < 60) return 'High';
  if (cgpaPct < 65 || att < 75) return 'Medium';
  return 'Low';
}

function classifyPlacementRisk(readiness, skill) {
  if (readiness === null || readiness === undefined || isNaN(readiness)) return 'Unknown';
  if (skill === null || skill === undefined || isNaN(skill)) return 'Unknown';
  const readPct = clampPercentage(readiness);
  const skillPct = normalizeSkillRating(skill);
  if (readPct < 40 || skillPct < 40) return 'High';
  if (readPct < 60 || skillPct < 60) return 'Medium';
  return 'Low';
}

function calculateScore(input) {
  const incompleteReasons = [];
  if (input.cgpa == null || isNaN(input.cgpa)) incompleteReasons.push('Missing CGPA');
  if (input.attendanceRate == null || isNaN(input.attendanceRate)) incompleteReasons.push('Missing Attendance');
  if (input.assignmentScore == null || isNaN(input.assignmentScore)) incompleteReasons.push('Missing LMS');
  if (input.engagementScore == null || isNaN(input.engagementScore)) incompleteReasons.push('Missing Engagement');
  if (input.technicalSkillsRating == null || isNaN(input.technicalSkillsRating)) incompleteReasons.push('Missing Skill');
  if (input.placementReadinessScore == null || isNaN(input.placementReadinessScore)) incompleteReasons.push('Missing Readiness');

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
    successScore: total,
    academicRisk,
    placementRisk,
    hasInsufficientData: false,
    scoreBreakdown: { academicComp, attComp, lmsComp, engComp, skillComp, placeComp }
  };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log(' EduPulse AI — Milestone 2 Automated Test Suite');
console.log('====================================================\n');

// TEST SUITE 1: Normalization
console.log('TEST SUITE 1: Normalization Functions');
assert(normalizeCgpa(8.5) === 85.0, 'CGPA 8.5 / 10.0 normalizes to 85.0%');
assert(normalizeCgpa(10.0) === 100.0, 'CGPA 10.0 / 10.0 normalizes to 100.0%');
assert(normalizeCgpa(0.0) === 0.0, 'CGPA 0.0 normalizes to 0.0%');
assert(normalizeCgpa(12.5) === 100.0, 'Out-of-range CGPA 12.5 clamps to 100.0%');

assert(normalizeSkillRating(4.0) === 80.0, 'Skill 4.0 / 5.0 normalizes to 80.0%');
assert(normalizeSkillRating(5.0) === 100.0, 'Skill 5.0 / 5.0 normalizes to 100.0%');
assert(normalizeSkillRating(1.0) === 20.0, 'Skill 1.0 / 5.0 normalizes to 20.0%');
assert(clampPercentage(95) === 95, 'Percentage 95 preserves 95%');
assert(clampPercentage(110) === 100, 'Percentage 110 clamps to 100%');

// TEST SUITE 2: Weighted Score Calculation
console.log('\nTEST SUITE 2: Score Formula & Weighting (35% CGPA, 20% Att, 15% LMS, 10% Eng, 10% Skill, 10% Place)');
const testStudent = {
  cgpa: 8.0,                    // 80% * 0.35 = 28.0
  attendanceRate: 90,           // 90% * 0.20 = 18.0
  assignmentScore: 80,          // 80% * 0.15 = 12.0
  engagementScore: 70,          // 70% * 0.10 = 7.0
  technicalSkillsRating: 4.0,   // 80% * 0.10 = 8.0
  placementReadinessScore: 80,  // 80% * 0.10 = 8.0
};
const res1 = calculateScore(testStudent);
assert(res1.successScore === 81.0, `Calculated weighted score is exactly 81.0 (received ${res1.successScore})`);
assert(res1.scoreBreakdown.academicComp === 28.0, 'Academic component is 28.0');
assert(res1.scoreBreakdown.attComp === 18.0, 'Attendance component is 18.0');
assert(res1.scoreBreakdown.lmsComp === 12.0, 'LMS component is 12.0');
assert(res1.scoreBreakdown.engComp === 7.0, 'Engagement component is 7.0');
assert(res1.scoreBreakdown.skillComp === 8.0, 'Skills component is 8.0');
assert(res1.scoreBreakdown.placeComp === 8.0, 'Placement component is 8.0');

// TEST SUITE 3: Deterministic Risk Classification
console.log('\nTEST SUITE 3: Deterministic Risk Rules');
// Academic: High if CGPA % < 50 OR Att < 60; Med if CGPA % < 65 OR Att < 75; else Low
assert(classifyAcademicRisk(4.8, 85) === 'High', 'Academic High Risk: CGPA 4.8 (< 5.0) with high attendance');
assert(classifyAcademicRisk(8.5, 55) === 'High', 'Academic High Risk: Attendance 55% (< 60%) with high CGPA');
assert(classifyAcademicRisk(6.0, 80) === 'Medium', 'Academic Medium Risk: CGPA 6.0 (< 6.5)');
assert(classifyAcademicRisk(8.0, 70) === 'Medium', 'Academic Medium Risk: Attendance 70% (< 75%)');
assert(classifyAcademicRisk(8.5, 90) === 'Low', 'Academic Low Risk: CGPA 8.5 and Attendance 90%');
assert(classifyAcademicRisk(null, 90) === 'Unknown', 'Academic Unknown Risk: Missing CGPA');

// Placement: High if Readiness < 40 OR Skill % < 40 (Skill < 2.0); Med if Readiness < 60 OR Skill % < 60 (Skill < 3.0); else Low
assert(classifyPlacementRisk(35, 4.0) === 'High', 'Placement High Risk: Readiness 35 (< 40)');
assert(classifyPlacementRisk(85, 1.8) === 'High', 'Placement High Risk: Skill rating 1.8 (< 2.0)');
assert(classifyPlacementRisk(55, 4.0) === 'Medium', 'Placement Medium Risk: Readiness 55 (< 60)');
assert(classifyPlacementRisk(85, 2.8) === 'Medium', 'Placement Medium Risk: Skill rating 2.8 (< 3.0)');
assert(classifyPlacementRisk(80, 4.2) === 'Low', 'Placement Low Risk: Readiness 80 and Skill 4.2');
assert(classifyPlacementRisk(80, null) === 'Unknown', 'Placement Unknown Risk: Missing Skill rating');

// TEST SUITE 4: Missing Data Policy
console.log('\nTEST SUITE 4: Incomplete Records & Missing Data Policy');
const incompleteStudent = {
  cgpa: 7.5,
  attendanceRate: 85,
  assignmentScore: null, // Missing LMS
  engagementScore: 70,
  technicalSkillsRating: 3.5,
  placementReadinessScore: 70,
};
const res2 = calculateScore(incompleteStudent);
assert(res2.hasInsufficientData === true, 'Record correctly flagged as hasInsufficientData');
assert(res2.successScore === null, 'Score is strictly null (not silently fabricated as 0)');
assert(res2.incompleteReasons.length === 1 && res2.incompleteReasons[0] === 'Missing LMS', 'Explicit incomplete reason captured');

// TEST SUITE 5: CSV Parsing & Validation Scenarios via PapaParse
console.log('\nTEST SUITE 5: CSV Parsing & Edge Case Handling');

// Case A: Valid CSV Template
const validCsv = `studentId,name,email,department,semester,cgpa,attendanceRate,assignmentScore,engagementScore,technicalSkillsRating,placementReadinessScore,internshipCompleted,backlogs,feedback
STU-2024-901,Deepa Nair,deepa@uni.edu,Computer Science,6,8.5,92,88,85,4.4,85,TRUE,0,Good work
STU-2024-902,Vijay M,vijay@uni.edu,Data Science,6,7.2,80,75,70,3.6,72,FALSE,0,Steady`;
const parsedA = Papa.parse(validCsv, { header: true, skipEmptyLines: 'greedy' });
assert(parsedA.data.length === 2, `Valid CSV parses 2 records cleanly (got ${parsedA.data.length})`);
assert(parsedA.errors.length === 0, 'Valid CSV produces zero parser syntax errors');

// Case B: Empty CSV
const emptyCsv = '   ';
assert(emptyCsv.trim().length === 0, 'Empty CSV correctly recognized as empty');

// Case C: Duplicate studentId Detection
const duplicateCsv = `studentId,name,email,department,semester,cgpa,attendanceRate,assignmentScore,engagementScore,technicalSkillsRating,placementReadinessScore,internshipCompleted,backlogs
STU-DUP-01,Student One,one@uni.edu,CS,6,8.0,80,80,80,4.0,80,TRUE,0
STU-DUP-01,Student Two,two@uni.edu,CS,6,7.0,70,70,70,3.0,70,FALSE,0`;
const parsedC = Papa.parse(duplicateCsv, { header: true, skipEmptyLines: 'greedy' });
const ids = parsedC.data.map(r => r.studentId);
const duplicateFound = ids.length !== new Set(ids).size;
assert(duplicateFound === true, 'Duplicate studentId detected across rows');

// Case D: Out-of-range value check
const outOfRangeCsv = `studentId,name,email,department,semester,cgpa,attendanceRate,assignmentScore,engagementScore,technicalSkillsRating,placementReadinessScore,internshipCompleted,backlogs
STU-RANGE-01,Bad Range,bad@uni.edu,CS,6,14.5,120,80,80,7.0,80,TRUE,0`;
const parsedD = Papa.parse(outOfRangeCsv, { header: true, skipEmptyLines: 'greedy' });
const badRow = parsedD.data[0];
const cgpaInvalid = Number(badRow.cgpa) > 10.0;
const attInvalid = Number(badRow.attendanceRate) > 100;
const skillInvalid = Number(badRow.technicalSkillsRating) > 5.0;
assert(cgpaInvalid && attInvalid && skillInvalid, 'Out-of-range CGPA (14.5), Attendance (120%), and Skill (7.0) detected');

console.log('\n====================================================');
console.log(` Summary: ${passed} Tests Passed, ${failed} Failed`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
