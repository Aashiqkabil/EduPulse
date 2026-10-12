# EduPulse AI — Student Success Platform

> **KPMG in India Hackathon Challenge:** *AI-Powered Student Analytics and Success Platform*  
> **Milestones 1 & 2:** Executive Dashboard, CSV Import, Validation Engine & Explainable Scoring

---

## 📌 Project Overview

**EduPulse AI** is a responsive, proactive student analytics platform designed to detect early academic friction, monitor student engagement, and evaluate placement readiness across academic departments.

- **Milestone 1:** Executive MVP dashboard running on verified synthetic benchmark data with interactive Recharts visualizations, multi-dimensional risk filtering, deep-dive modal, and responsive navigation.
- **Milestone 2:** Production-grade CSV upload and validation engine, deterministic and explainable 6-factor success scoring, multi-tier academic and placement risk classification, dataset replacement with rollback to synthetic data, and comprehensive automated test suites.

---

## 🛠 Technology Stack

- **Framework:** React 18 (TypeScript)
- **Tooling & Bundler:** Vite 6
- **Styling:** Tailwind CSS (Custom Color Tokens & Typography)
- **Data Visualization:** Recharts (Departmental Performance, Risk Distribution, Engagement Scatterplots)
- **Data Parsing & Export Engine:** PapaParse
- **Icons:** Lucide React
- **Test Suites:** Native Node.js test harnesses (`scripts/verify-scoring.mjs` and `scripts/verify-milestone2.mjs`)

---

## 🚀 Exact Windows PowerShell Setup & Run Commands

If you encounter Windows PowerShell script execution policy restrictions (`PSSecurityException` when running `npm`), execute with `npm.cmd` as shown below.

### 1. Clone / Navigate to Workspace
```powershell
cd D:\Hackathon\EduPulse
```

### 2. Install Dependencies
```powershell
npm.cmd install
```
*(Or `npm install` if your PowerShell execution policy allows script execution).*

### 3. Run Automated Verification Tests
```powershell
npm.cmd test
```
*Executes both test suites:*
- `node scripts/verify-scoring.mjs` (36 tests: rule boundaries, edge cases, formulas)
- `node scripts/verify-milestone2.mjs` (141 tests: CSV validation end-to-end, normalization, empty/malformed files, duplicate IDs, boundary conditions, dataset replacement semantics)

### 4. Start Development Server
```powershell
npm.cmd run dev
```
The application will launch on:
- **Local URL:** `http://localhost:3000/`

### 5. Build for Production
To run TypeScript type checks and compile the production bundle:
```powershell
npm.cmd run build
```

### 6. Preview Production Build
```powershell
npm.cmd run preview
```

---

## 📂 Project Architecture

```
EduPulse/
├── scripts/
│   ├── verify-scoring.mjs        # Scoring engine and risk threshold test harness (36 tests)
│   └── verify-milestone2.mjs      # Comprehensive Milestone 2 verification suite (141 tests)
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx              # Application header with search, dataset source badge & reset
│   │   │   ├── Sidebar.tsx             # Responsive sidebar with navigation tabs
│   │   │   ├── KpiCard.tsx             # Reusable metric card with trend indicators
│   │   │   ├── SyntheticBadge.tsx      # Synthetic vs. imported dataset indicator badge
│   │   │   ├── LoadingState.tsx        # Skeleton/spinner loading state
│   │   │   ├── EmptyState.tsx          # Zero-results feedback component
│   │   │   └── ErrorState.tsx          # Actionable error alert with retry trigger
│   │   └── dashboard/
│   │       ├── OverviewTab.tsx         # Executive KPI summary, Recharts graphs & priority table
│   │       ├── StudentsTab.tsx         # Searchable, filterable student directory with export
│   │       ├── AnalyticsTab.tsx        # Risk correlation graphs & 3x3 Risk Matrix
│   │       ├── DataImportTab.tsx       # Drag-and-drop CSV upload, validation report & confirmation
│   │       └── StudentDetailModal.tsx  # Deep-dive student modal with 6-factor score breakdown
│   ├── data/
│   │   └── syntheticStudents.ts        # Typed synthetic cohort (20 records with computed scores)
│   ├── types/
│   │   └── student.ts                  # TypeScript interfaces for Student, RiskLevel, NavTab, ScoreBreakdown
│   ├── utils/
│   │   ├── scoringEngine.ts            # Explainable scoring engine and risk classification rules
│   │   └── csvValidator.ts             # CSV schema validator, normalization, error reporting & template
│   ├── App.tsx                         # Single-source-of-truth state controller (active dataset, filters)
│   ├── index.css                       # Tailwind CSS directives and custom styling
│   └── main.tsx                        # Application DOM entrypoint
├── index.html                          # HTML shell with Google Fonts
├── package.json                        # Dependencies and npm test/build scripts
├── postcss.config.js                   # PostCSS Tailwind and Autoprefixer config
├── tailwind.config.js                  # Tailwind design tokens
├── tsconfig.json                       # TypeScript compiler options
├── tsconfig.node.json                  # Vite TypeScript configuration
├── vite.config.ts                      # Vite configuration (port 3000)
└── README.md                           # Documentation, setup & verification instructions
```

---

## 📊 Milestone 2 Features & Enhancements

### 1. Transparent & Explainable Success Scoring Engine (`scoringEngine.ts`)
- **Normalized 6-Factor Model (0–100 Scale):**
  - **Academic Performance (CGPA):** 25% weight (normalized `cgpa * 10`)
  - **Attendance Rate:** 20% weight (0–100%)
  - **LMS Engagement Score:** 15% weight (0–100)
  - **Assignment Completion Rate:** 15% weight (0–100%)
  - **Technical Skills Rating:** 15% weight (normalized `technicalSkillsRating * 20`)
  - **Placement Readiness Score:** 10% weight (0–100)
- **Detailed Factor Breakdown:** Each student receives a `scoreBreakdown` containing the exact raw value, normalized 0–100 value, weight, and contribution points (summing to the total score).
- **Multi-tier Risk Classification:**
  - **Academic Risk:**
    - `High`: CGPA < 5.0 OR Attendance < 60%
    - `Medium`: CGPA < 6.5 OR Attendance < 75%
    - `Low`: Otherwise
  - **Placement Risk:**
    - `High`: Placement Readiness < 40 OR Technical Skills < 2.0 (40%)
    - `Medium`: Placement Readiness < 60 OR Technical Skills < 3.0 (60%)
    - `Low`: Otherwise
- **Insufficient Data Handling:** If required numeric metrics are missing, corrupted, or out of range, the scoring engine assigns `null` for `academicSuccessScore`, sets `hasInsufficientData: true`, and marks risk tiers as `"Unknown"` with specific incomplete reasons.

### 2. Comprehensive CSV Import & Validation Workflow (`DataImportTab.tsx` + `csvValidator.ts`)
- **Drag-and-Drop & File Picker:** Intuitive file ingestion zone with template download trigger.
- **Header Normalization:** Case-insensitive, underscore-agnostic, and space-tolerant header matching (`student_id` = `StudentId` = `STUDENT_ID`).
- **Strict Boundary & Format Validation:**
  - CGPA: `0.0 – 10.0`
  - Attendance, LMS, Assignment, Placement: `0.0 – 100.0%`
  - Technical Skills: `0.0 – 5.0`
  - Semester: `1 – 8`
  - Backlogs: `>= 0`
  - Internship: Booleans, `1/0`, `yes/no`, `Y/N`
  - Email: Standard email regex format
- **Duplicate ID Detection:** Rejects rows that share a `studentId` within the CSV.
- **Pre-Import Validation Report:**
  - Total rows, valid rows, invalid rows, warning, and duplicate counts.
  - Interactive table of errors and warnings with row numbers, field names, and actionable messages.
  - Downloadable CSV of validation errors (`Papa.unparse`) for easy remediation.
- **Transactional Confirmation:**
  - An import requires explicit user confirmation before applying.
  - Invalid CSV files or files with 0 valid records can never overwrite or corrupt the active dataset.

### 3. Single-Source-of-Truth Dataset Management (`App.tsx`)
- All dashboard views (Overview, Students directory, Analytics, Detail modal) read from the centralized `students` state.
- **Dataset Source Indicator:** Top navigation bar displays whether the system is running on `"Synthetic Demo (20)"` or `"Imported CSV"`.
- **Restore Demo Cohort Action:** Instantly restore the verified 20-student benchmark cohort with a single click.

---

## 🧪 Verification & Automated Testing

Both verification scripts are native Node.js ES modules requiring zero external test runner setup:

```powershell
npm.cmd test
```

### Test Coverage Highlights:
- **141 comprehensive tests in `verify-milestone2.mjs`:**
  - Standard & boundary CSV imports (all min/max fields)
  - Missing headers, empty CSV files, malformed numeric values
  - Out-of-bounds metrics (e.g. CGPA > 10, Skill > 5, Attendance < 0)
  - Duplicate student ID detection and rejection
  - Header normalization tolerance (spaces, uppercase, underscores)
  - Boolean parsing variations (`TRUE`, `1`, `yes`, `y`, `false`, `0`, `no`, `n`)
  - Error export formatting and re-parse validation
  - Dataset replacement semantics and rollback to synthetic data
- **36 mathematical tests in `verify-scoring.mjs`:**
  - Risk threshold boundary checks (e.g. CGPA 4.99 vs 5.0, Attendance 59% vs 60%)
  - Score calculations matching exact weighted sums
  - Insufficient data policy and incomplete reason tracking

---

## ⚖️ Disclaimers & Scope Restrictions

- **Synthetic Data Notice:** Default demo records are simulated for prototype demonstration.
- **Explainable Scoring Engine:** Success scores are transparent weighted averages designed for early academic triage, not automated or clinical high-stakes decisions.
- **Scope Boundary:** External database connections (e.g. Supabase) and backend authentication are reserved for future milestones. No private credentials or API keys are required.
