# EduPulse AI — Student Success Platform

> AI-Powered Student Analytics and Success Platform  
> Hackathon Project

## Project Overview

EduPulse AI is a student analytics platform designed to identify academic risks, monitor student engagement, and evaluate placement readiness.

### Key Features

- Executive dashboard with interactive charts
- Student directory with search and filtering
- CSV upload and data validation
- Explainable Student Success Score
- Academic and placement risk identification
- Student detail views with score breakdowns
- Synthetic demo data and dataset restoration
- Automated scoring and CSV validation tests

## Technology Stack

- React 18 with TypeScript
- Vite
- Tailwind CSS
- Recharts
- PapaParse
- Lucide React
- Node.js test scripts

## Getting Started

### 1. Open the project folder

```powershell
cd D:\Hackathon\EduPulse
```

### 2. Install dependencies

```powershell
npm.cmd install
```

### 3. Run tests

```powershell
npm.cmd test
```

### 4. Start the development server

```powershell
npm.cmd run dev
```

Open the local URL displayed in your terminal.

### 5. Build for production

```powershell
npm.cmd run build
```

## Student Success Score

The illustrative scoring model combines six factors:

| Indicator | Weight |
|---|---:|
| CGPA | 25% |
| Attendance | 20% |
| LMS engagement | 15% |
| Assignment completion | 15% |
| Technical skills | 15% |
| Placement readiness | 10% |

The score is calculated on a 0–100 scale. Risk flags help faculty identify students who may benefit from additional support.

## CSV Import

The platform supports CSV uploads, header normalization, field validation, duplicate student ID detection, validation reports, and confirmation before importing a dataset.

## Testing

Run the automated verification scripts with:

```powershell
npm.cmd test
```

## Data Disclaimer

Synthetic student records are intended for prototype demonstrations. Scores and risk classifications are illustrative and should not be treated as validated predictions or used as the sole basis for consequential student decisions.

## Future Scope

- Database integration
- Authentication and role-based access
- Additional predictive analytics
- More detailed intervention tracking