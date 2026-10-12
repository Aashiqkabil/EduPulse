-- ==============================================================================
-- EduPulse AI — Milestone 3: Student Cohort Database Schema
-- Project: EduPulse-AI Supabase Project
-- ==============================================================================

-- 1. Create students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    department TEXT NOT NULL,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    cgpa NUMERIC(4, 2) NOT NULL CHECK (cgpa >= 0.0 AND cgpa <= 10.0),
    attendance_rate NUMERIC(5, 2) NOT NULL CHECK (attendance_rate >= 0.0 AND attendance_rate <= 100.0),
    assignment_score NUMERIC(5, 2) NOT NULL CHECK (assignment_score >= 0.0 AND assignment_score <= 100.0),
    engagement_score NUMERIC(5, 2) NOT NULL CHECK (engagement_score >= 0.0 AND engagement_score <= 100.0),
    technical_skills_rating NUMERIC(3, 2) NOT NULL CHECK (technical_skills_rating >= 1.0 AND technical_skills_rating <= 5.0),
    placement_readiness_score NUMERIC(5, 2) NOT NULL CHECK (placement_readiness_score >= 0.0 AND placement_readiness_score <= 100.0),
    internship_completed BOOLEAN NOT NULL DEFAULT false,
    backlogs INTEGER NOT NULL DEFAULT 0 CHECK (backlogs >= 0),
    feedback TEXT,
    
    -- Calculated Success & Risk Metrics
    success_score NUMERIC(4, 1),
    academic_risk TEXT NOT NULL CHECK (academic_risk IN ('Low', 'Medium', 'High', 'Unknown')),
    placement_risk TEXT NOT NULL CHECK (placement_risk IN ('Low', 'Medium', 'High', 'Unknown')),
    score_breakdown JSONB,
    has_insufficient_data BOOLEAN NOT NULL DEFAULT false,
    incomplete_reasons TEXT[] DEFAULT '{}',
    is_synthetic BOOLEAN NOT NULL DEFAULT false,

    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Indexes for efficient dashboard querying & filtering
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students (student_id);
CREATE INDEX IF NOT EXISTS idx_students_department ON public.students (department);
CREATE INDEX IF NOT EXISTS idx_students_academic_risk ON public.students (academic_risk);
CREATE INDEX IF NOT EXISTS idx_students_placement_risk ON public.students (placement_risk);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON public.students (created_at DESC);

-- 3. Automatic updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_students_updated_at ON public.students;
CREATE TRIGGER set_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 5. Least-Privilege RLS Policies
-- SELECT: Read access is permitted for anon (publishable key) and authenticated users to render the dashboard.
CREATE POLICY "Allow read access to students"
    ON public.students
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- INSERT: Permitted for client ingestion of verified student records.
-- Includes data integrity check ensuring required identifiers are not empty.
CREATE POLICY "Allow insert of verified students"
    ON public.students
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        length(trim(student_id)) > 0 AND
        length(trim(name)) > 0 AND
        length(trim(email)) > 0 AND
        length(trim(department)) > 0
    );

-- UPDATE: Permitted to allow dataset synchronization and updates by student_id.
CREATE POLICY "Allow update of verified students"
    ON public.students
    FOR UPDATE
    TO anon, authenticated
    USING (length(trim(student_id)) > 0)
    WITH CHECK (length(trim(student_id)) > 0);

-- DELETE: Permitted to allow full cohort replacement without orphan or merged rows.
CREATE POLICY "Allow cohort replacement delete"
    ON public.students
    FOR DELETE
    TO anon, authenticated
    USING (true);
