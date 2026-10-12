import { Student, DemoIdentity } from '../types/student';
import { calculateStudentSuccessScore } from '../utils/scoringEngine';

export const DATASET_METADATA = {
  version: '2.0.0-synthetic',
  isSynthetic: true,
  disclaimer: 'SYNTHETIC BENCHMARK DATA: All student records and scoring indicators are simulated for dashboard prototyping. Scores and risk tiers are illustrative mock values calculated via the prototype scoring engine and do not represent clinical or validated AI predictions.',
  totalRecords: 20,
  generatedDate: '2026-10-12',
};

interface RawSyntheticStudent {
  studentId: string;
  name: string;
  email: string;
  department: string;
  semester: number;
  cgpa: number;
  attendanceRate: number;
  assignmentScore: number;
  engagementScore: number;
  technicalSkillsRating: number;
  placementReadinessScore: number;
  internshipCompleted: boolean;
  backlogs: number;
  feedback: string;
  lastUpdated: string;
}

const RAW_SYNTHETIC_DATA: RawSyntheticStudent[] = [
  {
    studentId: 'STU-2024-001',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@campus.edu',
    department: 'Computer Science',
    semester: 6,
    cgpa: 8.92,
    attendanceRate: 94,
    assignmentScore: 91,
    engagementScore: 90,
    technicalSkillsRating: 4.8,
    placementReadinessScore: 92,
    internshipCompleted: true,
    backlogs: 0,
    feedback: 'Consistent high performer in algorithms and cloud computing projects.',
    lastUpdated: '2026-10-10'
  },
  {
    studentId: 'STU-2024-002',
    name: 'Ananya Iyer',
    email: 'ananya.iyer@campus.edu',
    department: 'Data Science',
    semester: 6,
    cgpa: 8.45,
    attendanceRate: 88,
    assignmentScore: 86,
    engagementScore: 85,
    technicalSkillsRating: 4.2,
    placementReadinessScore: 84,
    internshipCompleted: true,
    backlogs: 0,
    feedback: 'Active participant in machine learning hackathons and workshops.',
    lastUpdated: '2026-10-10'
  },
  {
    studentId: 'STU-2024-003',
    name: 'Rohan Verma',
    email: 'rohan.verma@campus.edu',
    department: 'Information Technology',
    semester: 6,
    cgpa: 6.18,
    attendanceRate: 68,
    assignmentScore: 62,
    engagementScore: 60,
    technicalSkillsRating: 2.6,
    placementReadinessScore: 50,
    internshipCompleted: false,
    backlogs: 2,
    feedback: 'Requires mentoring in system architecture and regular attendance.',
    lastUpdated: '2026-10-11'
  },
  {
    studentId: 'STU-2024-004',
    name: 'Pooja Nair',
    email: 'pooja.nair@campus.edu',
    department: 'Electronics & Comm',
    semester: 6,
    cgpa: 7.65,
    attendanceRate: 84,
    assignmentScore: 78,
    engagementScore: 75,
    technicalSkillsRating: 3.5,
    placementReadinessScore: 68,
    internshipCompleted: false,
    backlogs: 0,
    feedback: 'Steady progress in digital signal processing; preparing for mock interviews.',
    lastUpdated: '2026-10-09'
  },
  {
    studentId: 'STU-2024-005',
    name: 'Vikram Sengupta',
    email: 'vikram.s@campus.edu',
    department: 'Computer Science',
    semester: 6,
    cgpa: 4.82,
    attendanceRate: 58,
    assignmentScore: 52,
    engagementScore: 48,
    technicalSkillsRating: 1.8,
    placementReadinessScore: 36,
    internshipCompleted: false,
    backlogs: 3,
    feedback: 'High academic and placement risk flag triggered. Needs remedial mentoring.',
    lastUpdated: '2026-10-11'
  },
  {
    studentId: 'STU-2024-006',
    name: 'Meera Patel',
    email: 'meera.patel@campus.edu',
    department: 'Data Science',
    semester: 6,
    cgpa: 9.15,
    attendanceRate: 96,
    assignmentScore: 94,
    engagementScore: 95,
    technicalSkillsRating: 4.9,
    placementReadinessScore: 96,
    internshipCompleted: true,
    backlogs: 0,
    feedback: 'Department rank 1 candidate with published paper in NLP.',
    lastUpdated: '2026-10-10'
  },
  {
    studentId: 'STU-2024-007',
    name: 'Kabir Das',
    email: 'kabir.das@campus.edu',
    department: 'Mechanical Eng',
    semester: 6,
    cgpa: 6.90,
    attendanceRate: 74,
    assignmentScore: 70,
    engagementScore: 68,
    technicalSkillsRating: 3.0,
    placementReadinessScore: 62,
    internshipCompleted: false,
    backlogs: 1,
    feedback: 'Good practical workshop skills; needs focus on analytical theory.',
    lastUpdated: '2026-10-08'
  },
  {
    studentId: 'STU-2024-008',
    name: 'Sneha Kulkarni',
    email: 'sneha.k@campus.edu',
    department: 'Information Technology',
    semester: 6,
    cgpa: 7.95,
    attendanceRate: 89,
    assignmentScore: 82,
    engagementScore: 80,
    technicalSkillsRating: 3.8,
    placementReadinessScore: 78,
    internshipCompleted: true,
    backlogs: 0,
    feedback: 'Completed full-stack internship; reliable assignment submission history.',
    lastUpdated: '2026-10-10'
  },
  {
    studentId: 'STU-2024-009',
    name: 'Aditya Chauhan',
    email: 'aditya.c@campus.edu',
    department: 'Electronics & Comm',
    semester: 6,
    cgpa: 6.40,
    attendanceRate: 71,
    assignmentScore: 65,
    engagementScore: 62,
    technicalSkillsRating: 2.8,
    placementReadinessScore: 54,
    internshipCompleted: false,
    backlogs: 2,
    feedback: 'Needs to clear backlogs before final placement registration.',
    lastUpdated: '2026-10-11'
  },
  {
    studentId: 'STU-2024-010',
    name: 'Kavya Pillai',
    email: 'kavya.pillai@campus.edu',
    department: 'Computer Science',
    semester: 6,
    cgpa: 8.10,
    attendanceRate: 91,
    assignmentScore: 85,
    engagementScore: 84,
    technicalSkillsRating: 4.1,
    placementReadinessScore: 82,
    internshipCompleted: true,
    backlogs: 0,
    feedback: 'Solid development portfolio and active open source contributions.',
    lastUpdated: '2026-10-09'
  },
  {
    studentId: 'STU-2024-011',
    name: 'Tanvi Rao',
    email: 'tanvi.rao@campus.edu',
    department: 'Data Science',
    semester: 6,
    cgpa: 7.20,
    attendanceRate: 79,
    assignmentScore: 76,
    engagementScore: 74,
    technicalSkillsRating: 3.4,
    placementReadinessScore: 69,
    internshipCompleted: false,
    backlogs: 0,
    feedback: 'Solid foundational data analysis skills; preparing for placement tests.',
    lastUpdated: '2026-10-10'
  },
  {
    studentId: 'STU-2024-012',
    name: 'Devansh Joshi',
    email: 'devansh.j@campus.edu',
    department: 'Mechanical Eng',
    semester: 6,
    cgpa: 4.95,
    attendanceRate: 59,
    assignmentScore: 54,
    engagementScore: 50,
    technicalSkillsRating: 1.9,
    placementReadinessScore: 38,
    internshipCompleted: false,
    backlogs: 2,
    feedback: 'Identified for academic improvement plan due to low attendance and CGPA.',
    lastUpdated: '2026-10-11'
  },
  {
    studentId: 'STU-2024-013',
    name: 'Priyanka Menon',
    email: 'priyanka.m@campus.edu',
    department: 'Computer Science',
    semester: 6,
    cgpa: 8.70,
    attendanceRate: 93,
    assignmentScore: 89,
    engagementScore: 88,
    technicalSkillsRating: 4.5,
    placementReadinessScore: 89,
    internshipCompleted: true,
    backlogs: 0,
    feedback: 'High aptitude scores and competitive coding proficiency.',
    lastUpdated: '2026-10-09'
  },
  {
    studentId: 'STU-2024-014',
    name: 'Siddharth Jain',
    email: 'sid.jain@campus.edu',
    department: 'Information Technology',
    semester: 6,
    cgpa: 7.42,
    attendanceRate: 80,
    assignmentScore: 74,
    engagementScore: 72,
    technicalSkillsRating: 3.2,
    placementReadinessScore: 68,
    internshipCompleted: false,
    backlogs: 1,
    feedback: 'Good problem-solving approach; needs to improve verbal presentation.',
    lastUpdated: '2026-10-10'
  },
  {
    studentId: 'STU-2024-015',
    name: 'Ritika Roy',
    email: 'ritika.roy@campus.edu',
    department: 'Electronics & Comm',
    semester: 6,
    cgpa: 8.35,
    attendanceRate: 90,
    assignmentScore: 83,
    engagementScore: 82,
    technicalSkillsRating: 3.9,
    placementReadinessScore: 80,
    internshipCompleted: true,
    backlogs: 0,
    feedback: 'Successfully delivered IoT smart sensor final project.',
    lastUpdated: '2026-10-09'
  },
  {
    studentId: 'STU-2024-016',
    name: 'Varun Reddy',
    email: 'varun.reddy@campus.edu',
    department: 'Mechanical Eng',
    semester: 6,
    cgpa: 7.15,
    attendanceRate: 77,
    assignmentScore: 72,
    engagementScore: 70,
    technicalSkillsRating: 3.1,
    placementReadinessScore: 66,
    internshipCompleted: false,
    backlogs: 0,
    feedback: 'Active participation in CAD modeling student club.',
    lastUpdated: '2026-10-10'
  },
  {
    studentId: 'STU-2024-017',
    name: 'Ishita Banerjee',
    email: 'ishita.b@campus.edu',
    department: 'Data Science',
    semester: 6,
    cgpa: 8.80,
    attendanceRate: 92,
    assignmentScore: 90,
    engagementScore: 89,
    technicalSkillsRating: 4.6,
    placementReadinessScore: 91,
    internshipCompleted: true,
    backlogs: 0,
    feedback: 'High proficiency in data engineering pipelines and Python.',
    lastUpdated: '2026-10-10'
  },
  {
    studentId: 'STU-2024-018',
    name: 'Gaurav Bhatt',
    email: 'gaurav.b@campus.edu',
    department: 'Information Technology',
    semester: 6,
    cgpa: 6.75,
    attendanceRate: 73,
    assignmentScore: 68,
    engagementScore: 66,
    technicalSkillsRating: 2.9,
    placementReadinessScore: 61,
    internshipCompleted: false,
    backlogs: 1,
    feedback: 'Participating in weekend coding bootcamps to improve skill rating.',
    lastUpdated: '2026-10-11'
  },
  {
    studentId: 'STU-2024-019',
    name: 'Deepak Chopra',
    email: 'deepak.c@campus.edu',
    department: 'Mechanical Eng',
    semester: 6,
    cgpa: 4.90,
    attendanceRate: 57,
    assignmentScore: 50,
    engagementScore: 46,
    technicalSkillsRating: 1.8,
    placementReadinessScore: 35,
    internshipCompleted: false,
    backlogs: 2,
    feedback: 'Needs urgent intervention in attendance and thermodynamics coursework.',
    lastUpdated: '2026-10-11'
  },
  {
    studentId: 'STU-2024-020',
    name: 'Neha Saxena',
    email: 'neha.saxena@campus.edu',
    department: 'Computer Science',
    semester: 6,
    cgpa: 8.60,
    attendanceRate: 91,
    assignmentScore: 88,
    engagementScore: 86,
    technicalSkillsRating: 4.3,
    placementReadinessScore: 87,
    internshipCompleted: true,
    backlogs: 0,
    feedback: 'Consistently strong academic and technical performance across terms.',
    lastUpdated: '2026-10-10'
  }
];

// Map raw synthetic data through the centralized scoring engine
export const SYNTHETIC_STUDENTS: Student[] = RAW_SYNTHETIC_DATA.map((item) => {
  const calc = calculateStudentSuccessScore({
    cgpa: item.cgpa,
    attendanceRate: item.attendanceRate,
    assignmentScore: item.assignmentScore,
    engagementScore: item.engagementScore,
    technicalSkillsRating: item.technicalSkillsRating,
    placementReadinessScore: item.placementReadinessScore
  });

  return {
    studentId: item.studentId,
    name: item.name,
    email: item.email,
    department: item.department,
    semester: item.semester,
    cgpa: item.cgpa,
    attendanceRate: item.attendanceRate,
    assignmentScore: item.assignmentScore,
    engagementScore: item.engagementScore,
    technicalSkillsRating: item.technicalSkillsRating,
    placementReadinessScore: item.placementReadinessScore,
    internshipCompleted: item.internshipCompleted,
    backlogs: item.backlogs,
    feedback: item.feedback,
    successScore: calc.successScore,
    academicRisk: calc.academicRisk,
    placementRisk: calc.placementRisk,
    scoreBreakdown: calc.scoreBreakdown,
    hasInsufficientData: calc.hasInsufficientData,
    incompleteReasons: calc.incompleteReasons,
    isSynthetic: true,
    lastUpdated: item.lastUpdated
  };
});

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Rohan', 'Priya', 'Vikram', 'Sneha', 'Aditya', 'Neha', 
  'Karan', 'Pooja', 'Rahul', 'Divya', 'Siddharth', 'Meera', 'Varun', 'Rhea', 
  'Amit', 'Ishaan', 'Tanvi', 'Kabir', 'Akash', 'Shruti', 'Nikhil', 'Swati',
  'Dev', 'Kavita', 'Manish', 'Ritika', 'Harsh', 'Anjali', 'Gaurav', 'Deepa'
];

const LAST_NAMES = [
  'Sharma', 'Iyer', 'Verma', 'Patel', 'Reddy', 'Deshmukh', 'Gupta', 'Singh',
  'Mehta', 'Nair', 'Chopra', 'Joshi', 'Menon', 'Kulkarni', 'Bose', 'Kapoor',
  'Banerjee', 'Rao', 'Bhat', 'Agarwal', 'Saxena', 'Pandey', 'Malhotra', 'Mishra'
];

const DEPARTMENTS = [
  'Computer Science', 'Data Science', 'Information Technology', 
  'AI & Machine Learning', 'Electronics', 'Mechanical'
];

/**
 * Generates an arbitrary number of realistic synthetic student records
 * supporting scalable benchmarks (e.g. 20, 21, 100, 500, 1,000+ records).
 */
export function generateSyntheticCohort(count: number): Student[] {
  if (count <= 0) return [];
  if (count === 20) return SYNTHETIC_STUDENTS;
  if (count < 20) return SYNTHETIC_STUDENTS.slice(0, count);

  const result: Student[] = [...SYNTHETIC_STUDENTS];

  for (let i = 21; i <= count; i++) {
    const paddedId = String(i).padStart(4, '0');
    const studentId = `STU-2024-${paddedId}`;
    
    // Deterministic pseudo-random values based on index
    const firstName = FIRST_NAMES[(i * 7 + 3) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 11 + 5) % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@campus.edu`;
    const department = DEPARTMENTS[i % DEPARTMENTS.length];
    const semester = ((i % 8) + 1);
    
    // Realistic metric distribution
    const baseVariance = ((i * 17) % 100) / 100;
    const cgpa = Number((4.5 + baseVariance * 5.2).toFixed(2)); // 4.5 to 9.7
    const attendanceRate = Math.min(100, Math.max(45, Math.round(50 + baseVariance * 48)));
    const assignmentScore = Math.min(100, Math.max(40, Math.round(45 + baseVariance * 52)));
    const engagementScore = Math.min(100, Math.max(35, Math.round(40 + baseVariance * 55)));
    const technicalSkillsRating = Number((1.5 + baseVariance * 3.4).toFixed(1)); // 1.5 to 4.9
    const placementReadinessScore = Math.min(100, Math.max(30, Math.round(35 + baseVariance * 62)));
    const internshipCompleted = baseVariance > 0.45;
    const backlogs = baseVariance < 0.25 ? Math.round((0.25 - baseVariance) * 12) : 0;
    const feedback = cgpa >= 8.0 
      ? 'Strong conceptual understanding and active technical engagement.' 
      : cgpa >= 6.5 
      ? 'Steady progress, recommended for additional project mentorship.' 
      : 'Identified for academic support and structured mentoring intervention.';

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
      scoreBreakdown: calc.scoreBreakdown,
      hasInsufficientData: calc.hasInsufficientData,
      incompleteReasons: calc.incompleteReasons,
      isSynthetic: true,
      lastUpdated: '2026-10-12'
    });
  }

  return result;
}

/**
 * Preconfigured Demo Identities for Stage 2 & 3 Hackathon Roles
 */
export const DEMO_IDENTITIES: DemoIdentity[] = [
  {
    id: 'admin-demo',
    name: 'Dr. Rajeshwar Rao',
    email: 'dean.rao@campus.edu',
    role: 'admin',
    title: 'Dean of Academic Affairs & Institutional Administrator',
    department: 'Academic Affairs',
    assignedScope: 'Institution-Wide (All Cohorts, Analytics & CSV Pipeline)',
    status: 'Active (Demo Administrator)',
    badge: 'Institutional Admin',
    bio: 'Oversees institutional performance metrics, accreditation compliance, and data ingestion pipelines.'
  },
  {
    id: 'teacher-demo',
    name: 'Prof. Ananya Sharma',
    email: 'prof.sharma@campus.edu',
    role: 'teacher',
    title: 'Associate Professor & Faculty Mentor',
    department: 'Computer Science',
    assignedScope: 'Class Section CS-301 (Computer Science, Semester 6)',
    assignedClassCode: 'CS-301',
    status: 'Active (Demo Faculty)',
    badge: 'Faculty Mentor',
    bio: 'Mentors Section CS-301. Authorized to review student risk alerts and update attendance and assessment marks.'
  },
  {
    id: 'student-demo-a',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@campus.edu',
    role: 'student',
    title: 'Undergraduate Scholar (High Performer)',
    department: 'Computer Science',
    assignedScope: 'Personal Academic Profile (Semester 6)',
    assignedStudentId: 'STU-2024-001',
    status: 'Active (Demo Student)',
    badge: 'Low Risk Tier',
    bio: 'Top-quartile student with 8.92 CGPA and 94% attendance rate. Preparing for cloud engineering placement.'
  },
  {
    id: 'student-demo-b',
    name: 'Rohan Verma',
    email: 'rohan.verma@campus.edu',
    role: 'student',
    title: 'Undergraduate Scholar (Academic Intervention Needed)',
    department: 'Information Technology',
    assignedScope: 'Personal Academic Profile (Semester 6)',
    assignedStudentId: 'STU-2024-003',
    status: 'Active (Demo Student)',
    badge: 'High Risk Tier',
    bio: 'Identified for academic mentoring due to attendance below 70% and 2 active backlogs.'
  }
];

export const DEFAULT_DEMO_IDENTITY = DEMO_IDENTITIES[0];

/**
 * Class Section CS-301 assigned student IDs for Teacher Demo
 */
export const TEACHER_ASSIGNED_CLASS = {
  code: 'CS-301',
  name: 'Data Structures & Algorithms Laboratory',
  department: 'Computer Science',
  semester: 6,
  section: 'A',
  studentIds: ['STU-2024-001', 'STU-2024-005', 'STU-2024-009', 'STU-2024-013', 'STU-2024-017']
};

