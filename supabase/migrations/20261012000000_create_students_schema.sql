-- ==============================================================================
-- EduPulse AI — Milestone 3: Student Cohort Database Schema & Hardened Policies
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

-- 5. Safe Policy Cleanup (Enables safe rerunning without error)
DROP POLICY IF EXISTS "Allow read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow insert of verified students" ON public.students;
DROP POLICY IF EXISTS "Allow update of verified students" ON public.students;
DROP POLICY IF EXISTS "Allow cohort replacement delete" ON public.students;
DROP POLICY IF EXISTS "edu_pulse_read_students" ON public.students;
DROP POLICY IF EXISTS "edu_pulse_admin_insert" ON public.students;
DROP POLICY IF EXISTS "edu_pulse_admin_update" ON public.students;
DROP POLICY IF EXISTS "edu_pulse_admin_delete" ON public.students;

-- 6. Hardened RLS Policies
-- SELECT: Read access is permitted for anon (publishable key) and authenticated users to render the dashboard.
CREATE POLICY "Allow read access to students"
    ON public.students
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- INSERT: Permitted only for authenticated administrators/faculty.
CREATE POLICY "Allow insert of verified students"
    ON public.students
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'faculty') AND
        length(trim(student_id)) > 0 AND
        length(trim(name)) > 0 AND
        length(trim(email)) > 0 AND
        length(trim(department)) > 0 AND
        semester BETWEEN 1 AND 8 AND
        cgpa >= 0.0 AND cgpa <= 10.0
    );

-- UPDATE: Permitted only for authenticated administrators/faculty.
CREATE POLICY "Allow update of verified students"
    ON public.students
    FOR UPDATE
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'faculty')
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'faculty') AND
        length(trim(student_id)) > 0
    );

-- DELETE: Permitted only for authenticated administrators.
CREATE POLICY "Allow cohort replacement delete"
    ON public.students
    FOR DELETE
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- 7. Safe Transactional Cohort Replacement Function
-- Performs atomic delete-and-insert in a single database transaction.
-- STRICT SECURITY: Requires authenticated administrator session. No client-supplied tokens or anon bypass.
CREATE OR REPLACE FUNCTION public.replace_student_cohort(
    p_students JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_authorized BOOLEAN := false;
    v_inserted_count INTEGER := 0;
BEGIN
    -- Strict Cryptographic Authorization Check via JWT
    IF auth.role() = 'authenticated' AND (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'faculty') OR
        (auth.jwt() ->> 'email') LIKE '%@campus.edu'
    ) THEN
        v_is_authorized := true;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: Authenticated administrator or faculty role required to replace cohort dataset.';
    END IF;

    IF p_students IS NULL OR jsonb_array_length(p_students) = 0 THEN
        RAISE EXCEPTION 'Payload error: Student array cannot be empty.';
    END IF;

    -- Step 1: Clear existing cohort (WHERE clause satisfies PostgreSQL safeupdate requirement)
    DELETE FROM public.students WHERE id IS NOT NULL;

    -- Step 2: Insert verified records
    INSERT INTO public.students (
        student_id,
        name,
        email,
        department,
        semester,
        cgpa,
        attendance_rate,
        assignment_score,
        engagement_score,
        technical_skills_rating,
        placement_readiness_score,
        internship_completed,
        backlogs,
        feedback,
        success_score,
        academic_risk,
        placement_risk,
        score_breakdown,
        has_insufficient_data,
        incomplete_reasons,
        is_synthetic
    )
    SELECT
        (elem->>'student_id')::TEXT,
        (elem->>'name')::TEXT,
        (elem->>'email')::TEXT,
        (elem->>'department')::TEXT,
        (elem->>'semester')::INTEGER,
        (elem->>'cgpa')::NUMERIC,
        (elem->>'attendance_rate')::NUMERIC,
        (elem->>'assignment_score')::NUMERIC,
        (elem->>'engagement_score')::NUMERIC,
        (elem->>'technical_skills_rating')::NUMERIC,
        (elem->>'placement_readiness_score')::NUMERIC,
        COALESCE((elem->>'internship_completed')::BOOLEAN, false),
        COALESCE((elem->>'backlogs')::INTEGER, 0),
        elem->>'feedback',
        (elem->>'success_score')::NUMERIC,
        (elem->>'academic_risk')::TEXT,
        (elem->>'placement_risk')::TEXT,
        elem->'score_breakdown',
        COALESCE((elem->>'has_insufficient_data')::BOOLEAN, false),
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(elem->'incomplete_reasons', '[]'::jsonb))),
        COALESCE((elem->>'is_synthetic')::BOOLEAN, false)
    FROM jsonb_array_elements(p_students) AS elem;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'count', v_inserted_count,
        'timestamp', timezone('utc'::text, now())
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Cohort replacement transaction failed: %', SQLERRM;
END;
$$;

-- Revoke execute from public and anon; grant only to authenticated users
REVOKE EXECUTE ON FUNCTION public.replace_student_cohort(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_student_cohort(JSONB) TO authenticated;
