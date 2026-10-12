# EduPulse AI — Student Success Platform

> AI-Powered Student Analytics and Success Platform  
> Hackathon Prototype — Milestone 2 Verified

## Project Overview

EduPulse AI is a student analytics and early-intervention platform designed to identify academic and placement risks, monitor student engagement, evaluate technical and career readiness, and provide explainable success metrics for academic leadership and mentors.

### Key Features

- **Executive Dashboard**: Dynamic cohort KPIs, department distributions, and priority intervention lists.
- **Student Directory**: Multi-attribute filtering (department, academic risk, placement risk), text search, and column sorting.
- **Risk Analytics**: Attendance vs. performance cross-analysis, department skill readiness, and risk matrix.
- **Explainable Student Success Score**: Transparent 6-factor deterministic model with full score breakdowns.
- **Deterministic Risk Flagging**: Clear rule-based Academic and Placement risk classifications (`High`, `Medium`, `Low`, `Unknown`).
- **Robust CSV Ingestion Engine**: Client-side PapaParse validator with header normalization, row-level validation, duplicate ID rejection, error CSV export, and confirmation modals.
- **Single-Source-of-Truth State Management**: Atomic dataset replacement ensures valid imports update all views instantly while preserving clean synthetic demo restoration.

---

## Technology Stack

- **Frontend**: React 18 with TypeScript, Vite
- **Styling**: Tailwind CSS
- **Visualizations**: Recharts
- **CSV Ingestion**: PapaParse
- **Icons**: Lucide React
- **Automated Verification**: Node.js test runner suites

---

## Getting Started

### 1. Open the project directory

```powershell
cd D:\Hackathon\EduPulse
```

### 2. Install dependencies

```powershell
npm.cmd install
```

### 3. Run automated tests

```powershell
npm.cmd test
```

### 4. Start the development server

```powershell
npm.cmd run dev
```

Open `http://localhost:3000/` in your browser.

### 5. Build for production

```powershell
npm.cmd run build
```

---

## Unified CSV Schema Specification

EduPulse AI expects a 14-column CSV format. Column headers are normalized automatically (whitespace, casing, and underscores/hyphens are tolerated).

| Column Header | Data Type | Required | Allowed Range / Format | Description |
|---|---|:---:|---|---|
| `studentId` | String | **Yes** | Non-empty text, unique | Unique Institutional Student ID (e.g., `STU-2024-001`) |
| `name` | String | **Yes** | Non-empty text | Student Full Name |
| `email` | String | **Yes** | Valid email with `@` | Institutional Email Address |
| `department` | String | **Yes** | Non-empty text | Academic Department / Program |
| `semester` | Integer | **Yes** | `1` to `8` | Current Academic Semester |
| `cgpa` | Number | **Yes** | `0.0` to `10.0` | Cumulative Grade Point Average |
| `attendanceRate` | Number | **Yes** | `0` to `100` (%) | Overall Lecture Attendance Percentage |
| `assignmentScore` | Number | **Yes** | `0` to `100` (%) | LMS Assignment Completion Rate |
| `engagementScore` | Number | **Yes** | `0` to `100` (%) | Student Platform Engagement Index |
| `technicalSkillsRating` | Number | **Yes** | `1.0` to `5.0` | Faculty / Assessment Technical Skill Rating |
| `placementReadinessScore`| Number | **Yes** | `0` to `100` (%) | Career / Placement Readiness Assessment Score |
| `internshipCompleted` | Boolean| **Yes** | `TRUE` / `FALSE` (`1`/`0`, `yes`/`no`) | Internship Completion Status |
| `backlogs` | Integer | **Yes** | Integer $\ge 0$ | Count of Active Academic Backlogs |
| `feedback` | String | *No* | Freeform text | Qualitative Faculty / Mentor Notes |

### Test Fixtures Provided

The repository includes reproducible CSV fixtures in `test-fixtures/`:
- `test-fixtures/valid-students.csv`: 5 verified student records spanning multiple departments and risk profiles.
- `test-fixtures/invalid-students.csv`: 11 records containing every supported validation error (out-of-range CGPA, invalid attendance, duplicate IDs, negative backlogs, invalid email, etc.).
- `test-fixtures/empty.csv`: Empty file testing zero-byte ingestion protection.
- `test-fixtures/mixed-students.csv`: File containing valid and invalid rows demonstrating error isolation.

---

## Scoring Model & Deterministic Rules

> **Important Methodology Notice**:  
> The scoring rules implemented here are illustrative prototype heuristics designed for hackathon demonstration. They are **NOT certified AI predictions** and do **NOT represent official KPMG institutional weights**.

### Illustrative Factor Weighting (100% Total)

$$\text{Success Score} = \sum (\text{Normalized Metric} \times \text{Weight})$$

| Indicator | Weight | Normalization Formula | Max Contribution |
|---|:---:|---|:---:|
| **Academic CGPA** | **35%** | $(\text{CGPA} / 10.0) \times 100$ | 35.0 pts |
| **Attendance Rate** | **20%** | $\text{Clamped}(0, 100)$ | 20.0 pts |
| **LMS Assignment Score** | **15%** | $\text{Clamped}(0, 100)$ | 15.0 pts |
| **Engagement Score** | **10%** | $\text{Clamped}(0, 100)$ | 10.0 pts |
| **Technical Skill Rating** | **10%** | $(\text{Skill} / 5.0) \times 100$ | 10.0 pts |
| **Placement Readiness** | **10%** | $\text{Clamped}(0, 100)$ | 10.0 pts |

### Deterministic Risk Classification Thresholds

#### Academic Risk (`academicRisk`)
- **High Risk**: $\text{CGPA} < 5.0$ (normalized $< 50\%$) **OR** $\text{Attendance} < 60\%$
- **Medium Risk**: $\text{CGPA} < 6.5$ (normalized $< 65\%$) **OR** $\text{Attendance} < 75\%$
- **Low Risk**: Otherwise
- **Unknown Risk**: Missing, null, undefined, or out-of-range ($\text{CGPA} < 0$ or $> 10$, $\text{Attendance} < 0$ or $> 100$)

#### Placement Risk (`placementRisk`)
- **High Risk**: $\text{Placement Readiness} < 40\%$ **OR** $\text{Technical Skill} < 2.0$ (normalized $< 40\%$)
- **Medium Risk**: $\text{Placement Readiness} < 60\%$ **OR** $\text{Technical Skill} < 3.0$ (normalized $< 60\%$)
- **Low Risk**: Otherwise
- **Unknown Risk**: Missing, null, undefined, or out-of-range ($\text{Readiness} < 0$ or $> 100$, $\text{Skill} < 0$ or $> 5.0$)

### Missing & Invalid Data Policy

- If any required scoring metric is missing, `NaN`, or out-of-bounds:
  - `successScore` is set to `null` (never fabricated as zero).
  - `hasInsufficientData` is set to `true`.
  - Explanatory entries are added to `incompleteReasons`.
  - Academic or placement risk evaluates to `Unknown` instead of incorrectly falling back to `Low`.

---

## CSV Validation & Ingestion Behavior

1. **Header Normalization**: Tolerates mixed case (`studentId`, `Student_ID`, `STUDENT_ID`), spaces, and underscores.
2. **Strict Duplicate Detection**: Any duplicate `studentId` present in the CSV file causes **all** occurrences of that ID to be rejected.
3. **Atomic Dataset Replacement**: Invalid imports never partially overwrite or corrupt the active dataset. If a file has 0 valid rows, the import cannot be applied.
4. **User Confirmation**: When a valid CSV is uploaded, an ingestion staging review displays counts of valid vs. rejected rows. Applying the dataset requires explicit user confirmation.
5. **Downloadable Error Reports**: If validation errors are detected, users can download an export CSV detailing Row Number, Student ID, Affected Column, Invalid Value, and Validation Rule Issue.
6. **Instant Dashboard Synchronization**: Applying an import replaces `activeStudents` in the top-level state, immediately updating:
   - Overview KPI cards, department charts, and priority intervention tables.
   - Student Directory search, department filters, and sorting.
   - Risk Analytics distributions and cross-tabulation matrix.
   - Student Detail Modal metrics and score breakdowns.
7. **Clean Restore Demo**: A "Restore Demo" button in the global toolbar instantly reverts to the original 20 synthetic demo records without merging data.

---

## Automated Verification & Test Results

Run all test suites via:

```powershell
npm.cmd test
```

### Verification Summary

| Test Suite | Focus Area | Checks | Result |
|---|---|:---:|:---:|
| **Suite 1** | Normalization Functions (CGPA, Skill, Clamping) | 16 | **PASS** |
| **Suite 2** | Academic Risk Boundaries & Unknown Fallbacks | 15 | **PASS** |
| **Suite 3** | Placement Risk Boundaries & Unknown Fallbacks | 14 | **PASS** |
| **Suite 4** | Weighted Score Formula (Hand-calculated verification) | 7 | **PASS** |
| **Suite 5** | Missing Data & Insufficient Data Policy | 14 | **PASS** |
| **Suite 6** | Header Normalization & Casing Tolerance | 5 | **PASS** |
| **Suite 7** | Boolean String Value Parsing | 12 | **PASS** |
| **Suite 8** | CSV Validation: Empty File Handling | 4 | **PASS** |
| **Suite 9** | CSV Validation: Valid 3-Row File Ingestion | 9 | **PASS** |
| **Suite 10** | CSV Validation: Missing Required Headers Detection | 3 | **PASS** |
| **Suite 11** | CSV Validation: Duplicate Student ID Detection | 3 | **PASS** |
| **Suite 12** | CSV Validation: Out-of-Bounds & Invalid Numeric Fields | 10 | **PASS** |
| **Suite 13** | CSV Validation: Scale Boundaries (Semester 1–8, CGPA 0–10, Skill 1–5) | 6 | **PASS** |
| **Suite 14** | CSV Validation: Mixed Valid & Invalid Row Segregation | 5 | **PASS** |
| **Suite 15** | Error Export to CSV Generation & Structure | 5 | **PASS** |
| **Suite 16** | Header Tolerance on Ingested Records | 3 | **PASS** |
| **Suite 17** | Dataset Replacement & Non-merging Semantics | 7 | **PASS** |
| **Suite 18** | Scoring Consistency on Imported Rows | 6 | **PASS** |
| **Suite 19** | Semester Boundary Validation (0 & 9 rejected, 1 & 8 accepted) | 3 | **PASS** |
| **Suite 20** | Email Format Validation (`@` presence requirement) | 2 | **PASS** |
| **Suite 21** | Disk Fixture E2E Validation (`valid`, `invalid`, `empty`, `mixed`) | 20 | **PASS** |
| **Suite 22** | Sample CSV Template Generator & Re-parse Compatibility | 10 | **PASS** |
| **Suite 23** | Dashboard KPI Calculations, Filtering & Modal Score Breakdown | 16 | **PASS** |
| **Total Automated Tests** | **Full Verification Suite** | **205** | **205 PASS, 0 FAIL** |

### Build & Type Safety Verification

- **TypeScript Typecheck (`tsc --noEmit`)**: Completed with **0 errors**.
- **Production Build (`tsc && vite build`)**: Completed successfully with **0 errors** in 10.55s.

---

## Supabase Integration

EduPulse AI includes end-to-end integration with Supabase for persistent cohort data storage, real-time database queries, and transactional dataset replacement. When Supabase is not configured or offline, the application gracefully operates in local Demo Mode without data loss.

### 1. Environment Configuration

To connect your EduPulse AI dashboard to your Supabase project:

1. Create a local `.env` file in the project root (`D:\Hackathon\EduPulse\.env`):
   ```bash
   cp .env.example .env
   ```
2. Populate the environment variables with your **EduPulse-AI** project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
   ```
   *(Alternatively, `VITE_SUPABASE_ANON_KEY` is also supported)*

> [!CAUTION]
> **Security Notice**: Never place or expose a Supabase `service_role` (secret) key in `.env` or frontend code. The application client uses only the standard anon/publishable key and enforces security via Row Level Security (RLS).
> 
> The `.env` file is strictly excluded by `.gitignore` to prevent secret leakage.

### 2. Database Schema & Migration Setup

The database migration is located at [`supabase/migrations/20261012000000_create_students_schema.sql`](file:///D:/Hackathon/EduPulse/supabase/migrations/20261012000000_create_students_schema.sql).

#### Schema Details (`public.students`):

| Column | Type | Constraints / Check Rules |
|---|---|---|
| `id` | `uuid` | Primary Key, `default gen_random_uuid()` |
| `student_id` | `varchar(64)` | Unique, Not Null |
| `name` | `varchar(255)` | Not Null |
| `email` | `varchar(255)` | Not Null |
| `department` | `varchar(128)` | Not Null |
| `semester` | `smallint` | `semester BETWEEN 1 AND 8` |
| `cgpa` | `numeric(4,2)` | `cgpa >= 0.0 AND cgpa <= 10.0` |
| `attendance_rate` | `numeric(5,2)` | `attendance_rate >= 0.0 AND attendance_rate <= 100.0` |
| `assignment_score` | `numeric(5,2)` | `assignment_score >= 0.0 AND assignment_score <= 100.0` |
| `engagement_score` | `numeric(5,2)` | `engagement_score >= 0.0 AND engagement_score <= 100.0` |
| `technical_skills_rating` | `numeric(3,2)` | `technical_skills_rating >= 1.0 AND technical_skills_rating <= 5.0` |
| `placement_readiness_score`| `numeric(5,2)` | `placement_readiness_score >= 0.0 AND placement_readiness_score <= 100.0` |
| `internship_completed` | `boolean` | Not Null, Default `false` |
| `backlogs` | `smallint` | `backlogs >= 0` |
| `feedback` | `text` | Nullable |
| `success_score` | `numeric(5,2)` | Calculated score, `0.0` to `100.0` |
| `academic_risk` | `varchar(16)` | `academic_risk IN ('High', 'Medium', 'Low', 'Unknown')` |
| `placement_risk` | `varchar(16)` | `placement_risk IN ('High', 'Medium', 'Low', 'Unknown')` |
| `created_at` | `timestamptz` | Default `timezone('utc', now())` |
| `updated_at` | `timestamptz` | Default `timezone('utc', now())` |

#### Applying the Migration:

1. Open your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Select your **EduPulse-AI** project.
3. Navigate to **SQL Editor** in the left sidebar.
4. Copy the entire contents of [`supabase/migrations/20261012000000_create_students_schema.sql`](file:///D:/Hackathon/EduPulse/supabase/migrations/20261012000000_create_students_schema.sql) into the editor.
5. Click **Run**.

### 3. Row Level Security (RLS) Policies

Row Level Security is enabled on the `students` table (`ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;`). Least-privilege policies are defined for `anon` and `authenticated` roles:

1. **Read Access (`edu_pulse_select_students`)**:
   - `FOR SELECT TO anon, authenticated USING (true)`
   - Allows read-only access to student directory and analytics.
2. **Verified Insert Access (`edu_pulse_insert_students`)**:
   - `FOR INSERT TO anon, authenticated WITH CHECK (student_id IS NOT NULL AND semester BETWEEN 1 AND 8 AND cgpa >= 0.0 AND cgpa <= 10.0)`
   - Guarantees rows inserted via CSV ingestion meet verified schema constraints.
3. **Update Access (`edu_pulse_update_students`)**:
   - `FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (student_id IS NOT NULL AND semester BETWEEN 1 AND 8 AND cgpa >= 0.0 AND cgpa <= 10.0)`
   - Ensures updates maintain valid data integrity.
4. **Cohort Replacement Access (`edu_pulse_delete_students`)**:
   - `FOR DELETE TO anon, authenticated USING (true)`
   - Required for atomic cohort replacement during verified CSV ingestion.

### 4. CSV Import & Persistence Workflow

When importing a CSV cohort:
1. **Validation Staging**: The file is parsed and validated in-memory using the strict 14-column validator.
2. **Persistence Toggle**: In the Data Import tab, a checkbox enables *"Persist cohort to Supabase database"*.
3. **User Confirmation**: The modal displays the verified count and warns that applying the import will replace existing database records with the new cohort.
4. **Batch Persistence**: Records are converted to the database model (`toDbStudent`) and upserted in batches of 100 with error rollback protection.
5. **Fail-Safe Isolation**: If database persistence fails (e.g. network timeout or RLS denial), the staging view retains the uploaded CSV data, displays the exact error message, and does not corrupt the current active dataset.
6. **Demo Mode Preservation**: Clicking "Restore Demo" reverts the local view to the synthetic 20-student cohort without deleting Supabase records.

---

## Data Disclaimer

Synthetic student records and illustrative scoring calculations are intended solely for educational prototype demonstrations. Risk classifications and success scores are illustrative heuristics and must not be used as the sole basis for consequential academic or disciplinary decisions.

---

## Milestone Scope & Roadmap

- [x] **Milestone 1**: Executive UI, Synthetic Dataset, Dashboard Tabs & Visualizations.
- [x] **Milestone 2**: CSV Ingestion Pipeline, Scoring Engine Verification, Boundary Testing, Automated Test Suites.
- [x] **Milestone 3**: Supabase Integration (Database schema, migration, RLS policies, safe persistence service, connection badge, offline demo fallback).
- [ ] **Milestone 4 (Future)**: Institutional Authentication & Role-Based Access Control.