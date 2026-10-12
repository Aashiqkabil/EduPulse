-- ==============================================================================
-- EduPulse AI — Milestone 4: Gate 1.5 Corrected Minimum RBAC Migration Draft
-- Project: EduPulse-AI Supabase Project
-- Notice: LOCAL DRAFT FOR REVIEW ONLY. DO NOT EXECUTE ON REMOTE WITHOUT APPROVAL.
-- ==============================================================================

BEGIN;

-- 1. Create User Profiles Catalog Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    email TEXT UNIQUE,
    full_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Preflight: Check for existing duplicate normalized emails in public.profiles before creating unique index
DO $$
DECLARE
    v_dup_emails TEXT;
BEGIN
    SELECT pg_catalog.string_agg(lower_email || ' (' || cnt || ' occurrences)', ', ')
    INTO v_dup_emails
    FROM (
        SELECT pg_catalog.lower(trim(email)) AS lower_email, pg_catalog.count(*) AS cnt
        FROM public.profiles
        WHERE email IS NOT NULL
        GROUP BY pg_catalog.lower(trim(email))
        HAVING pg_catalog.count(*) > 1
    ) dups;

    IF v_dup_emails IS NOT NULL THEN
        RAISE EXCEPTION 'Preflight Failure: Existing duplicate normalized emails found in public.profiles: %. Resolve duplicates before applying unique index.', v_dup_emails;
    END IF;
END $$;

-- Verify definition of uq_profiles_email_lower using exact catalog inspection & dependency assessment
DO $$
DECLARE
    v_idx_oid OID;
    v_is_correct BOOLEAN := false;
    v_dep_count INTEGER;
    v_dep_descs TEXT;
BEGIN
    SELECT c.oid INTO v_idx_oid
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'uq_profiles_email_lower';

    IF v_idx_oid IS NOT NULL THEN
        -- Inspect pg_index and expression catalog
        SELECT (
            i.indrelid = 'public.profiles'::regclass AND
            i.indisunique = true AND
            i.indnatts = 1 AND
            i.indpred IS NULL AND
            (pg_get_expr(i.indexprs, i.indrelid) IN ('lower(btrim(email))', 'lower(trim(both from email))', 'lower(trim(email))'))
        ) INTO v_is_correct
        FROM pg_index i
        WHERE i.indexrelid = v_idx_oid;

        IF v_is_correct THEN
            RAISE NOTICE 'Index uq_profiles_email_lower already exists with verified catalog definition.';
        ELSE
            -- Check for external dependencies before dropping
            SELECT pg_catalog.count(*), pg_catalog.string_agg(d.classid::regclass::text || ':' || d.objid::text, ', ')
            INTO v_dep_count, v_dep_descs
            FROM pg_depend d
            WHERE d.refobjid = v_idx_oid
              AND d.deptype IN ('n', 'a')
              AND d.classid != 'pg_class'::regclass;

            IF v_dep_count > 0 THEN
                RAISE EXCEPTION 'Dependency Blocker: Cannot replace existing index uq_profiles_email_lower because % object(s) depend on it: %. Resolve dependencies before proceeding.',
                    v_dep_count, v_dep_descs;
            END IF;

            RAISE NOTICE 'Replacing existing index uq_profiles_email_lower with incorrect catalog definition.';
            DROP INDEX public.uq_profiles_email_lower;
            CREATE UNIQUE INDEX uq_profiles_email_lower ON public.profiles (lower(trim(email)));
        END IF;
    ELSE
        CREATE UNIQUE INDEX uq_profiles_email_lower ON public.profiles (lower(trim(email)));
    END IF;
END $$;

-- 2. Create Classes Catalog Table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    section TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create Teacher Assignments Table
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_teacher_class UNIQUE (teacher_id, class_id)
);

-- 4. Extend public.students with Foreign Keys (Safe, Non-Destructive Alteration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'profile_id'
    ) THEN
        ALTER TABLE public.students ADD COLUMN profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'class_id'
    ) THEN
        ALTER TABLE public.students ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Verify definitions of idx_students_class_id and idx_students_profile_id using catalog inspection & dependency checks
DO $$
DECLARE
    v_idx_oid OID;
    v_is_correct BOOLEAN;
    v_dep_count INTEGER;
    v_dep_descs TEXT;
BEGIN
    -- 1. idx_students_class_id
    SELECT c.oid INTO v_idx_oid
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_students_class_id';

    IF v_idx_oid IS NOT NULL THEN
        SELECT (
            i.indrelid = 'public.students'::regclass AND
            i.indisunique = false AND
            i.indnatts = 1 AND
            i.indpred IS NULL AND
            pg_get_indexdef(v_idx_oid, 1, true) = 'class_id'
        ) INTO v_is_correct
        FROM pg_index i
        WHERE i.indexrelid = v_idx_oid;

        IF v_is_correct THEN
            RAISE NOTICE 'Index idx_students_class_id already exists with verified catalog definition.';
        ELSE
            SELECT pg_catalog.count(*), pg_catalog.string_agg(d.classid::regclass::text || ':' || d.objid::text, ', ')
            INTO v_dep_count, v_dep_descs
            FROM pg_depend d
            WHERE d.refobjid = v_idx_oid AND d.deptype IN ('n', 'a') AND d.classid != 'pg_class'::regclass;

            IF v_dep_count > 0 THEN
                RAISE EXCEPTION 'Dependency Blocker: Cannot replace existing index idx_students_class_id because % object(s) depend on it: %.',
                    v_dep_count, v_dep_descs;
            END IF;

            DROP INDEX public.idx_students_class_id;
            CREATE INDEX idx_students_class_id ON public.students (class_id);
        END IF;
    ELSE
        CREATE INDEX idx_students_class_id ON public.students (class_id);
    END IF;

    -- 2. idx_students_profile_id
    v_idx_oid := NULL;
    SELECT c.oid INTO v_idx_oid
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_students_profile_id';

    IF v_idx_oid IS NOT NULL THEN
        SELECT (
            i.indrelid = 'public.students'::regclass AND
            i.indisunique = false AND
            i.indnatts = 1 AND
            i.indpred IS NULL AND
            pg_get_indexdef(v_idx_oid, 1, true) = 'profile_id'
        ) INTO v_is_correct
        FROM pg_index i
        WHERE i.indexrelid = v_idx_oid;

        IF v_is_correct THEN
            RAISE NOTICE 'Index idx_students_profile_id already exists with verified catalog definition.';
        ELSE
            SELECT pg_catalog.count(*), pg_catalog.string_agg(d.classid::regclass::text || ':' || d.objid::text, ', ')
            INTO v_dep_count, v_dep_descs
            FROM pg_depend d
            WHERE d.refobjid = v_idx_oid AND d.deptype IN ('n', 'a') AND d.classid != 'pg_class'::regclass;

            IF v_dep_count > 0 THEN
                RAISE EXCEPTION 'Dependency Blocker: Cannot replace existing index idx_students_profile_id because % object(s) depend on it: %.',
                    v_dep_count, v_dep_descs;
            END IF;

            DROP INDEX public.idx_students_profile_id;
            CREATE INDEX idx_students_profile_id ON public.students (profile_id);
        END IF;
    ELSE
        CREATE INDEX idx_students_profile_id ON public.students (profile_id);
    END IF;
END $$;

-- Preflight: Check for existing duplicate normalized emails in public.students before creating unique index
DO $$
DECLARE
    v_dup_emails TEXT;
BEGIN
    SELECT pg_catalog.string_agg(lower_email || ' (' || cnt || ' occurrences)', ', ')
    INTO v_dup_emails
    FROM (
        SELECT pg_catalog.lower(trim(email)) AS lower_email, pg_catalog.count(*) AS cnt
        FROM public.students
        WHERE email IS NOT NULL
        GROUP BY pg_catalog.lower(trim(email))
        HAVING pg_catalog.count(*) > 1
    ) dups;

    IF v_dup_emails IS NOT NULL THEN
        RAISE EXCEPTION 'Preflight Failure: Existing duplicate normalized emails found in public.students: %. Resolve duplicates before applying unique index.', v_dup_emails;
    END IF;
END $$;

-- Verify definition of uq_students_email_lower using exact catalog inspection & dependency checks
DO $$
DECLARE
    v_idx_oid OID;
    v_is_correct BOOLEAN := false;
    v_dep_count INTEGER;
    v_dep_descs TEXT;
BEGIN
    SELECT c.oid INTO v_idx_oid
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'uq_students_email_lower';

    IF v_idx_oid IS NOT NULL THEN
        SELECT (
            i.indrelid = 'public.students'::regclass AND
            i.indisunique = true AND
            i.indnatts = 1 AND
            i.indpred IS NULL AND
            (pg_get_expr(i.indexprs, i.indrelid) IN ('lower(btrim(email))', 'lower(trim(both from email))', 'lower(trim(email))'))
        ) INTO v_is_correct
        FROM pg_index i
        WHERE i.indexrelid = v_idx_oid;

        IF v_is_correct THEN
            RAISE NOTICE 'Index uq_students_email_lower already exists with verified catalog definition.';
        ELSE
            SELECT pg_catalog.count(*), pg_catalog.string_agg(d.classid::regclass::text || ':' || d.objid::text, ', ')
            INTO v_dep_count, v_dep_descs
            FROM pg_depend d
            WHERE d.refobjid = v_idx_oid
              AND d.deptype IN ('n', 'a')
              AND d.classid != 'pg_class'::regclass;

            IF v_dep_count > 0 THEN
                RAISE EXCEPTION 'Dependency Blocker: Cannot replace existing index uq_students_email_lower because % object(s) depend on it: %.',
                    v_dep_count, v_dep_descs;
            END IF;

            RAISE NOTICE 'Replacing existing index uq_students_email_lower with incorrect catalog definition.';
            DROP INDEX public.uq_students_email_lower;
            CREATE UNIQUE INDEX uq_students_email_lower ON public.students (lower(trim(email)));
        END IF;
    ELSE
        CREATE UNIQUE INDEX uq_students_email_lower ON public.students (lower(trim(email)));
    END IF;
END $$;

-- 5. Create System Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Verify definitions of audit_logs indexes using exact catalog inspection & dependency checks
DO $$
DECLARE
    v_idx_oid OID;
    v_is_correct BOOLEAN;
    v_dep_count INTEGER;
    v_dep_descs TEXT;
BEGIN
    -- 1. idx_audit_logs_actor
    SELECT c.oid INTO v_idx_oid
    FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_audit_logs_actor';

    IF v_idx_oid IS NOT NULL THEN
        SELECT (
            i.indrelid = 'public.audit_logs'::regclass AND
            i.indisunique = false AND
            i.indnatts = 1 AND
            i.indpred IS NULL AND
            pg_get_indexdef(v_idx_oid, 1, true) = 'actor_id'
        ) INTO v_is_correct
        FROM pg_index i WHERE i.indexrelid = v_idx_oid;

        IF NOT v_is_correct THEN
            SELECT pg_catalog.count(*), pg_catalog.string_agg(d.classid::regclass::text || ':' || d.objid::text, ', ')
            INTO v_dep_count, v_dep_descs
            FROM pg_depend d WHERE d.refobjid = v_idx_oid AND d.deptype IN ('n', 'a') AND d.classid != 'pg_class'::regclass;
            IF v_dep_count > 0 THEN
                RAISE EXCEPTION 'Dependency Blocker: Cannot replace idx_audit_logs_actor due to % dependent object(s): %.', v_dep_count, v_dep_descs;
            END IF;
            DROP INDEX public.idx_audit_logs_actor;
            CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_id);
        END IF;
    ELSE
        CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_id);
    END IF;

    -- 2. idx_audit_logs_created_at
    v_idx_oid := NULL;
    SELECT c.oid INTO v_idx_oid
    FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_audit_logs_created_at';

    IF v_idx_oid IS NOT NULL THEN
        SELECT (
            i.indrelid = 'public.audit_logs'::regclass AND
            i.indisunique = false AND
            i.indnatts = 1 AND
            i.indpred IS NULL AND
            pg_get_indexdef(v_idx_oid, 1, true) = 'created_at DESC'
        ) INTO v_is_correct
        FROM pg_index i WHERE i.indexrelid = v_idx_oid;

        IF NOT v_is_correct THEN
            SELECT pg_catalog.count(*), pg_catalog.string_agg(d.classid::regclass::text || ':' || d.objid::text, ', ')
            INTO v_dep_count, v_dep_descs
            FROM pg_depend d WHERE d.refobjid = v_idx_oid AND d.deptype IN ('n', 'a') AND d.classid != 'pg_class'::regclass;
            IF v_dep_count > 0 THEN
                RAISE EXCEPTION 'Dependency Blocker: Cannot replace idx_audit_logs_created_at due to % dependent object(s): %.', v_dep_count, v_dep_descs;
            END IF;
            DROP INDEX public.idx_audit_logs_created_at;
            CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
        END IF;
    ELSE
        CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
    END IF;

    -- 3. idx_audit_logs_target
    v_idx_oid := NULL;
    SELECT c.oid INTO v_idx_oid
    FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'idx_audit_logs_target';

    IF v_idx_oid IS NOT NULL THEN
        SELECT (
            i.indrelid = 'public.audit_logs'::regclass AND
            i.indisunique = false AND
            i.indnatts = 2 AND
            i.indpred IS NULL AND
            pg_get_indexdef(v_idx_oid, 1, true) = 'target_table' AND
            pg_get_indexdef(v_idx_oid, 2, true) = 'target_id'
        ) INTO v_is_correct
        FROM pg_index i WHERE i.indexrelid = v_idx_oid;

        IF NOT v_is_correct THEN
            SELECT pg_catalog.count(*), pg_catalog.string_agg(d.classid::regclass::text || ':' || d.objid::text, ', ')
            INTO v_dep_count, v_dep_descs
            FROM pg_depend d WHERE d.refobjid = v_idx_oid AND d.deptype IN ('n', 'a') AND d.classid != 'pg_class'::regclass;
            IF v_dep_count > 0 THEN
                RAISE EXCEPTION 'Dependency Blocker: Cannot replace idx_audit_logs_target due to % dependent object(s): %.', v_dep_count, v_dep_descs;
            END IF;
            DROP INDEX public.idx_audit_logs_target;
            CREATE INDEX idx_audit_logs_target ON public.audit_logs (target_table, target_id);
        END IF;
    ELSE
        CREATE INDEX idx_audit_logs_target ON public.audit_logs (target_table, target_id);
    END IF;
END $$;

-- 6. Enable Row Level Security (RLS) across all five tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 7. Scalar Authentication & Authorization Helpers (NULL-Safe)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT p.role INTO v_role
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_active = true;

    RETURN v_role;
END;
$$;

ALTER FUNCTION public.get_auth_role() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_auth_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE((public.get_auth_role() = 'admin'), false);
$$;

ALTER FUNCTION public.is_active_admin() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;

-- 8. Clean up ALL Known Legacy Policies on public.students
DROP POLICY IF EXISTS "Allow read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow insert of verified students" ON public.students;
DROP POLICY IF EXISTS "Allow update of verified students" ON public.students;
DROP POLICY IF EXISTS "Allow cohort replacement delete" ON public.students;
DROP POLICY IF EXISTS "edu_pulse_read_students" ON public.students;
DROP POLICY IF EXISTS "edu_pulse_admin_insert" ON public.students;
DROP POLICY IF EXISTS "edu_pulse_admin_update" ON public.students;
DROP POLICY IF EXISTS "edu_pulse_admin_delete" ON public.students;

-- Clean up Legacy replace_student_cohort after Verifying Zero Unresolved Dependencies
DO $$
DECLARE
    r RECORD;
    v_dep_count INTEGER;
    v_dep_descriptions TEXT;
BEGIN
    FOR r IN (
        SELECT p.oid AS func_oid, p.oid::regprocedure AS func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'replace_student_cohort'
    ) LOOP
        -- Inspect pg_depend: Ensure no external triggers, views, or routines depend on this function
        SELECT pg_catalog.count(*), pg_catalog.string_agg(d.classid::regclass::text || ':' || d.objid::text, ', ')
        INTO v_dep_count, v_dep_descriptions
        FROM pg_depend d
        WHERE d.refobjid = r.func_oid
          AND d.deptype IN ('n', 'a')
          AND d.classid != 'pg_proc'::regclass;

        IF v_dep_count > 0 THEN
            RAISE EXCEPTION 'Dependency Blocker: Cannot drop legacy function % because % object(s) depend on it: %. Resolve dependencies before removing.',
                r.func_signature, v_dep_count, v_dep_descriptions;
        END IF;

        EXECUTE 'REVOKE ALL ON FUNCTION ' || r.func_signature || ' FROM PUBLIC, anon, authenticated';
        EXECUTE 'DROP FUNCTION ' || r.func_signature;
    END LOOP;
END $$;

-- 9. Table Grants Configuration (Least-Privilege Defense Tier 1)
-- Revoke ALL privileges (including TRUNCATE, REFERENCES, TRIGGER) on all 5 tables
REVOKE ALL PRIVILEGES ON TABLE 
    public.students,
    public.profiles,
    public.classes,
    public.teacher_assignments,
    public.audit_logs
FROM PUBLIC, anon, authenticated;

-- Explicitly grant only least required privileges:
-- A. Students: SELECT only for authenticated users (all writes route through audited RPCs)
GRANT SELECT ON public.students TO authenticated;

-- B. Profiles: SELECT for authenticated; UPDATE only for full_name (column-level grant blocks role/status tampering)
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

-- C. Classes: SELECT, INSERT, UPDATE, DELETE for authenticated (scoped by RLS to admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;

-- D. Teacher Assignments: SELECT, INSERT, UPDATE, DELETE for authenticated (scoped by RLS to admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_assignments TO authenticated;

-- E. Audit Logs: SELECT only for authenticated (scoped by RLS to admin; writes route through SECURITY DEFINER RPCs)
GRANT SELECT ON public.audit_logs TO authenticated;

-- 10. Row Level Security Policies (Defense Tier 2)

-- A. Policies for public.students
DROP POLICY IF EXISTS "students_student_self_select" ON public.students;
CREATE POLICY "students_student_self_select"
    ON public.students FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid() AND 
        public.get_auth_role() = 'student'
    );

DROP POLICY IF EXISTS "students_teacher_scoped_select" ON public.students;
CREATE POLICY "students_teacher_scoped_select"
    ON public.students FOR SELECT TO authenticated
    USING (
        public.get_auth_role() = 'teacher' AND
        EXISTS (
            SELECT 1 FROM public.teacher_assignments ta
            WHERE ta.teacher_id = auth.uid()
              AND ta.class_id = public.students.class_id
              AND ta.is_active = true
        )
    );

DROP POLICY IF EXISTS "students_admin_global_select" ON public.students;
CREATE POLICY "students_admin_global_select"
    ON public.students FOR SELECT TO authenticated
    USING (public.is_active_admin());

-- B. Policies for public.profiles
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
CREATE POLICY "profiles_self_select"
    ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_teacher_assigned_select" ON public.profiles;
CREATE POLICY "profiles_teacher_assigned_select"
    ON public.profiles FOR SELECT TO authenticated
    USING (
        public.get_auth_role() = 'teacher' AND
        EXISTS (
            SELECT 1 FROM public.students s
            JOIN public.teacher_assignments ta ON s.class_id = ta.class_id
            WHERE s.profile_id = public.profiles.id
              AND ta.teacher_id = auth.uid()
              AND ta.is_active = true
        )
    );

DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select"
    ON public.profiles FOR SELECT TO authenticated
    USING (public.is_active_admin());

-- Non-recursive self-update policy: Enforces row ownership; column-level grant strictly limits update to full_name
DROP POLICY IF EXISTS "profiles_self_update_name" ON public.profiles;
CREATE POLICY "profiles_self_update_name"
    ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- C. Policies for public.classes
DROP POLICY IF EXISTS "classes_authenticated_select" ON public.classes;
CREATE POLICY "classes_authenticated_select"
    ON public.classes FOR SELECT TO authenticated
    USING (public.get_auth_role() IS NOT NULL);

DROP POLICY IF EXISTS "classes_admin_all" ON public.classes;
CREATE POLICY "classes_admin_all"
    ON public.classes FOR ALL TO authenticated
    USING (public.is_active_admin())
    WITH CHECK (public.is_active_admin());

-- D. Policies for public.teacher_assignments
DROP POLICY IF EXISTS "teacher_assignments_teacher_select" ON public.teacher_assignments;
CREATE POLICY "teacher_assignments_teacher_select"
    ON public.teacher_assignments FOR SELECT TO authenticated
    USING (teacher_id = auth.uid() AND public.get_auth_role() = 'teacher');

DROP POLICY IF EXISTS "teacher_assignments_admin_all" ON public.teacher_assignments;
CREATE POLICY "teacher_assignments_admin_all"
    ON public.teacher_assignments FOR ALL TO authenticated
    USING (public.is_active_admin())
    WITH CHECK (public.is_active_admin());

-- E. Policies for public.audit_logs
DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_select"
    ON public.audit_logs FOR SELECT TO authenticated
    USING (public.is_active_admin());

-- 11. Authoritative Deterministic Scoring Function (Strict Parity with scoringEngine.ts and base table schema)
CREATE OR REPLACE FUNCTION public.calculate_student_metrics(
    p_cgpa NUMERIC,
    p_attendance NUMERIC,
    p_assignment NUMERIC,
    p_engagement NUMERIC,
    p_skills NUMERIC,
    p_placement NUMERIC
)
RETURNS TABLE (
    success_score NUMERIC,
    academic_risk TEXT,
    placement_risk TEXT,
    score_breakdown JSONB,
    has_insufficient_data BOOLEAN,
    incomplete_reasons TEXT[]
)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
    v_cgpa_norm NUMERIC;
    v_skills_norm NUMERIC;
    v_att_norm NUMERIC;
    v_lms_norm NUMERIC;
    v_eng_norm NUMERIC;
    v_place_norm NUMERIC;
    v_acad_comp NUMERIC;
    v_att_comp NUMERIC;
    v_lms_comp NUMERIC;
    v_eng_comp NUMERIC;
    v_skill_comp NUMERIC;
    v_place_comp NUMERIC;
    v_total NUMERIC;
    v_reasons TEXT[] := '{}';
    v_acad_risk TEXT := 'Low';
    v_place_risk TEXT := 'Low';
BEGIN
    -- Check nulls and presence (Strict parity with students check constraints and scoringEngine.ts)
    IF p_cgpa IS NULL OR p_cgpa < 0.0 OR p_cgpa > 10.0 THEN
        v_reasons := pg_catalog.array_append(v_reasons, 'Missing or invalid CGPA');
    END IF;
    IF p_attendance IS NULL OR p_attendance < 0.0 OR p_attendance > 100.0 THEN
        v_reasons := pg_catalog.array_append(v_reasons, 'Missing or invalid Attendance Rate');
    END IF;
    IF p_assignment IS NULL OR p_assignment < 0.0 OR p_assignment > 100.0 THEN
        v_reasons := pg_catalog.array_append(v_reasons, 'Missing or invalid LMS Assignment Score');
    END IF;
    IF p_engagement IS NULL OR p_engagement < 0.0 OR p_engagement > 100.0 THEN
        v_reasons := pg_catalog.array_append(v_reasons, 'Missing or invalid Engagement Score');
    END IF;
    -- Validated against students_technical_skills_rating_check (1.0 to 5.0)
    IF p_skills IS NULL OR p_skills < 1.0 OR p_skills > 5.0 THEN
        v_reasons := pg_catalog.array_append(v_reasons, 'Missing or invalid Technical Skill Rating');
    END IF;
    IF p_placement IS NULL OR p_placement < 0.0 OR p_placement > 100.0 THEN
        v_reasons := pg_catalog.array_append(v_reasons, 'Missing or invalid Placement Readiness Score');
    END IF;

    -- Evaluate academic risk
    IF p_cgpa IS NOT NULL AND p_attendance IS NOT NULL AND p_cgpa >= 0.0 AND p_cgpa <= 10.0 AND p_attendance >= 0.0 AND p_attendance <= 100.0 THEN
        IF ((p_cgpa / 10.0) * 100.0) < 50.0 OR p_attendance < 60.0 THEN
            v_acad_risk := 'High';
        ELSIF ((p_cgpa / 10.0) * 100.0) < 65.0 OR p_attendance < 75.0 THEN
            v_acad_risk := 'Medium';
        ELSE
            v_acad_risk := 'Low';
        END IF;
    ELSE
        v_acad_risk := 'Unknown';
    END IF;

    -- Evaluate placement risk
    IF p_placement IS NOT NULL AND p_skills IS NOT NULL AND p_placement >= 0.0 AND p_placement <= 100.0 AND p_skills >= 1.0 AND p_skills <= 5.0 THEN
        IF p_placement < 40.0 OR ((p_skills / 5.0) * 100.0) < 40.0 THEN
            v_place_risk := 'High';
        ELSIF p_placement < 60.0 OR ((p_skills / 5.0) * 100.0) < 60.0 THEN
            v_place_risk := 'Medium';
        ELSE
            v_place_risk := 'Low';
        END IF;
    ELSE
        v_place_risk := 'Unknown';
    END IF;

    -- If any input is missing or invalid, flag incomplete
    IF pg_catalog.array_length(v_reasons, 1) > 0 THEN
        RETURN QUERY SELECT NULL::NUMERIC, v_acad_risk, v_place_risk, NULL::JSONB, true, v_reasons;
        RETURN;
    END IF;

    -- Normalization
    v_cgpa_norm   := pg_catalog.round((p_cgpa / 10.0) * 100.0, 2);
    v_skills_norm := pg_catalog.round((p_skills / 5.0) * 100.0, 2);
    v_att_norm    := pg_catalog.round(p_attendance, 2);
    v_lms_norm    := pg_catalog.round(p_assignment, 2);
    v_eng_norm    := pg_catalog.round(p_engagement, 2);
    v_place_norm  := pg_catalog.round(p_placement, 2);

    -- Component weights (35% CGPA, 20% Attendance, 15% LMS, 10% Engagement, 10% Skills, 10% Placement)
    v_acad_comp  := pg_catalog.round(v_cgpa_norm * 0.35, 2);
    v_att_comp   := pg_catalog.round(v_att_norm * 0.20, 2);
    v_lms_comp   := pg_catalog.round(v_lms_norm * 0.15, 2);
    v_eng_comp   := pg_catalog.round(v_eng_norm * 0.10, 2);
    v_skill_comp := pg_catalog.round(v_skills_norm * 0.10, 2);
    v_place_comp := pg_catalog.round(v_place_norm * 0.10, 2);

    v_total := pg_catalog.round(v_acad_comp + v_att_comp + v_lms_comp + v_eng_comp + v_skill_comp + v_place_comp, 1);
    -- Special SQL expressions greatest and least are unqualified
    v_total := greatest(0.0, least(100.0, v_total));

    RETURN QUERY SELECT 
        v_total, 
        v_acad_risk, 
        v_place_risk, 
        pg_catalog.jsonb_build_object(
            'academicComponent', v_acad_comp,
            'attendanceComponent', v_att_comp,
            'lmsComponent', v_lms_comp,
            'engagementComponent', v_eng_comp,
            'skillsComponent', v_skill_comp,
            'placementComponent', v_place_comp,
            'cgpaNormalized', v_cgpa_norm,
            'attendanceNormalized', v_att_norm,
            'lmsNormalized', v_lms_norm,
            'engagementNormalized', v_eng_norm,
            'skillsNormalized', v_skills_norm,
            'placementNormalized', v_place_norm
        ), 
        false, 
        ARRAY[]::TEXT[];
END;
$$;

ALTER FUNCTION public.calculate_student_metrics(NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.calculate_student_metrics(NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_student_metrics(NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated;

-- Automatic In-Database Derived Metrics Recalculation Trigger
CREATE OR REPLACE FUNCTION public.trg_fn_calculate_student_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_metrics RECORD;
BEGIN
    SELECT * INTO v_metrics
    FROM public.calculate_student_metrics(
        NEW.cgpa,
        NEW.attendance_rate,
        NEW.assignment_score,
        NEW.engagement_score,
        NEW.technical_skills_rating,
        NEW.placement_readiness_score
    );

    NEW.success_score := v_metrics.success_score;
    NEW.academic_risk := v_metrics.academic_risk;
    NEW.placement_risk := v_metrics.placement_risk;
    NEW.score_breakdown := v_metrics.score_breakdown;
    NEW.has_insufficient_data := v_metrics.has_insufficient_data;
    NEW.incomplete_reasons := v_metrics.incomplete_reasons;

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.trg_fn_calculate_student_metrics() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_students_calculate_metrics ON public.students;
CREATE TRIGGER trg_students_calculate_metrics
    BEFORE INSERT OR UPDATE OF cgpa, attendance_rate, assignment_score, engagement_score, technical_skills_rating, placement_readiness_score
    ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.trg_fn_calculate_student_metrics();

-- Automatic User Profile Onboarding Trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_email TEXT;
    v_full_name TEXT;
BEGIN
    -- Extract verified institutional email from Auth record or provider metadata without inventing synthetic domains
    v_email := NULLIF(trim(COALESCE(NEW.email, NEW.raw_user_meta_data->>'email')), '');

    -- Extract full name from user metadata, falling back to email or default placeholder
    v_full_name := COALESCE(
        NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
        v_email,
        'EduPulse User'
    );

    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (
        NEW.id,
        v_email,
        v_full_name,
        'student', -- Always safe default student role; never derive role from user metadata
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(public.profiles.email, EXCLUDED.email),
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. Privileged Teacher Marks Update RPC (NULL-Safe Authorization and Assignment Verification)
CREATE OR REPLACE FUNCTION public.teacher_update_student_marks(
    p_student_id TEXT,
    p_attendance_rate NUMERIC,
    p_assignment_score NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_role TEXT;
    v_old_att NUMERIC;
    v_old_assign NUMERIC;
    v_updated_rows INTEGER;
BEGIN
    -- 1. NULL-Safe Caller Authorization Check
    v_caller_role := public.get_auth_role();
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Access Denied: Caller does not possess an active teacher or administrator role.';
    END IF;

    -- 2. Strict Input Validations
    IF p_student_id IS NULL OR pg_catalog.length(trim(p_student_id)) = 0 THEN
        RAISE EXCEPTION 'Validation Error: student_id cannot be null or empty.';
    END IF;
    IF p_attendance_rate IS NULL OR p_attendance_rate < 0.0 OR p_attendance_rate > 100.0 THEN
        RAISE EXCEPTION 'Validation Error: attendance_rate must be a valid number between 0 and 100.';
    END IF;
    IF p_assignment_score IS NULL OR p_assignment_score < 0.0 OR p_assignment_score > 100.0 THEN
        RAISE EXCEPTION 'Validation Error: assignment_score must be a valid number between 0 and 100.';
    END IF;

    -- 3. Row Lock & Authorization Verification without prior data leak
    -- For teachers: Lock and query student row ONLY if active teacher assignment exists.
    -- Avoids reading or returning student data to unassigned callers; prevents existence probing.
    IF v_caller_role = 'teacher' THEN
        SELECT s.attendance_rate, s.assignment_score
        INTO v_old_att, v_old_assign
        FROM public.students s
        JOIN public.teacher_assignments ta ON s.class_id = ta.class_id
        WHERE s.student_id = p_student_id
          AND ta.teacher_id = auth.uid()
          AND ta.is_active = true
        FOR UPDATE OF s;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Access Denied: Student not found or caller is not authorized for this record.';
        END IF;
    ELSE -- admin global override
        SELECT attendance_rate, assignment_score
        INTO v_old_att, v_old_assign
        FROM public.students
        WHERE student_id = p_student_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Student % not found in database.', p_student_id;
        END IF;
    END IF;

    -- 4. Update row (Trigger trg_students_calculate_metrics automatically recalculates derived metrics)
    UPDATE public.students
    SET attendance_rate = p_attendance_rate,
        assignment_score = p_assignment_score,
        updated_at = pg_catalog.clock_timestamp()
    WHERE student_id = p_student_id;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows != 1 THEN
        RAISE EXCEPTION 'Concurrency Conflict: Expected 1 updated row, got %.', v_updated_rows;
    END IF;

    -- 5. Audit Log (Atomic with target_id populated)
    INSERT INTO public.audit_logs (actor_id, action, target_table, target_id, old_data, new_data)
    VALUES (
        auth.uid(),
        'TEACHER_UPDATE_MARKS',
        'students',
        p_student_id,
        pg_catalog.jsonb_build_object('attendance_rate', v_old_att, 'assignment_score', v_old_assign),
        pg_catalog.jsonb_build_object('attendance_rate', p_attendance_rate, 'assignment_score', p_assignment_score)
    );

    RETURN pg_catalog.jsonb_build_object('success', true, 'student_id', p_student_id);
END;
$$;

ALTER FUNCTION public.teacher_update_student_marks(TEXT, NUMERIC, NUMERIC) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.teacher_update_student_marks(TEXT, NUMERIC, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_update_student_marks(TEXT, NUMERIC, NUMERIC) TO authenticated;

-- 13. Safe Admin Bulk CSV Upsert RPC (NULL-Safe Authorization and Atomic Batch Ingestion)
CREATE OR REPLACE FUNCTION public.upsert_student_cohort(
    p_students JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count INTEGER := 0;
    v_elem JSONB;
    v_dup_ids TEXT;
    v_dup_emails TEXT;
    v_target_batch_id TEXT;
    LOCK_KEY CONSTANT BIGINT := 918273645001;
BEGIN
    -- 1. NULL-Safe Authorization Check
    IF auth.uid() IS NULL OR public.get_auth_role() IS NULL OR public.get_auth_role() != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only active administrators can import student cohorts.';
    END IF;

    IF p_students IS NULL OR pg_catalog.jsonb_typeof(p_students) != 'array' OR pg_catalog.jsonb_array_length(p_students) = 0 THEN
        RAISE EXCEPTION 'Payload Error: Student batch must be a non-empty JSON array.';
    END IF;

    -- 2. Acquire Advisory Lock to Serialize Bulk Imports
    PERFORM pg_catalog.pg_advisory_xact_lock(LOCK_KEY);

    -- 3. Pass 1: In-Batch Duplicate Detection
    WITH batch_items AS (
        SELECT 
            elem->>'student_id' AS s_id,
            pg_catalog.lower(trim(elem->>'email')) AS s_email
        FROM pg_catalog.jsonb_array_elements(p_students) AS elem
    ),
    dup_ids AS (
        SELECT s_id, count(*) FROM batch_items GROUP BY s_id HAVING count(*) > 1
    ),
    dup_emails AS (
        SELECT s_email, count(*) FROM batch_items GROUP BY s_email HAVING count(*) > 1
    )
    SELECT 
        (SELECT pg_catalog.string_agg(s_id, ', ') FROM dup_ids),
        (SELECT pg_catalog.string_agg(s_email, ', ') FROM dup_emails)
    INTO v_dup_ids, v_dup_emails;

    IF v_dup_ids IS NOT NULL THEN
        RAISE EXCEPTION 'Batch Integrity Violation: Duplicate student_id(s) detected in batch: %', v_dup_ids;
    END IF;
    IF v_dup_emails IS NOT NULL THEN
        RAISE EXCEPTION 'Batch Integrity Violation: Duplicate email(s) detected in batch: %', v_dup_emails;
    END IF;

    -- 4. Pass 2: Strict Validation of 14 Whitelisted Fields & Protection of Derived Fields
    FOR v_elem IN SELECT * FROM pg_catalog.jsonb_array_elements(p_students) LOOP
        -- Reject protected system keys
        IF v_elem ? 'id' OR v_elem ? 'profile_id' OR v_elem ? 'class_id' OR v_elem ? 'created_at' OR v_elem ? 'updated_at' OR v_elem ? 'is_synthetic' THEN
            RAISE EXCEPTION 'Security Violation: System protected fields must not be supplied in payload for student %.', COALESCE(v_elem->>'student_id', 'unknown');
        END IF;

        -- Required Identifiers
        IF (v_elem->>'student_id') IS NULL OR pg_catalog.length(trim(v_elem->>'student_id')) = 0 THEN
            RAISE EXCEPTION 'Validation Error: Every record must have a non-empty student_id.';
        END IF;
        IF (v_elem->>'name') IS NULL OR pg_catalog.length(trim(v_elem->>'name')) = 0 THEN
            RAISE EXCEPTION 'Validation Error: Missing or empty name for student %.', v_elem->>'student_id';
        END IF;
        IF (v_elem->>'email') IS NULL OR (v_elem->>'email') !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
            RAISE EXCEPTION 'Validation Error: Invalid institutional email format for student %.', v_elem->>'student_id';
        END IF;
        IF (v_elem->>'department') IS NULL OR pg_catalog.length(trim(v_elem->>'department')) = 0 THEN
            RAISE EXCEPTION 'Validation Error: Missing department for student %.', v_elem->>'student_id';
        END IF;

        -- Number & Range Validations (Strict parity with students check constraints)
        IF (v_elem->>'semester') IS NULL OR ((v_elem->>'semester')::INTEGER < 1 OR (v_elem->>'semester')::INTEGER > 8) THEN
            RAISE EXCEPTION 'Validation Error: Semester out of range (1-8) for student %.', v_elem->>'student_id';
        END IF;
        IF (v_elem->>'cgpa') IS NULL OR ((v_elem->>'cgpa')::NUMERIC < 0.0 OR (v_elem->>'cgpa')::NUMERIC > 10.0) THEN
            RAISE EXCEPTION 'Validation Error: CGPA out of range (0.0 - 10.0) for student %.', v_elem->>'student_id';
        END IF;
        IF (v_elem->>'attendance_rate') IS NULL OR ((v_elem->>'attendance_rate')::NUMERIC < 0.0 OR ((v_elem->>'attendance_rate')::NUMERIC > 100.0)) THEN
            RAISE EXCEPTION 'Validation Error: Attendance Rate out of range (0-100) for student %.', v_elem->>'student_id';
        END IF;
        IF (v_elem->>'assignment_score') IS NULL OR ((v_elem->>'assignment_score')::NUMERIC < 0.0 OR ((v_elem->>'assignment_score')::NUMERIC > 100.0)) THEN
            RAISE EXCEPTION 'Validation Error: Assignment Score out of range (0-100) for student %.', v_elem->>'student_id';
        END IF;
        IF (v_elem->>'engagement_score') IS NULL OR ((v_elem->>'engagement_score')::NUMERIC < 0.0 OR ((v_elem->>'engagement_score')::NUMERIC > 100.0)) THEN
            RAISE EXCEPTION 'Validation Error: Engagement Score out of range (0-100) for student %.', v_elem->>'student_id';
        END IF;
        IF (v_elem->>'technical_skills_rating') IS NULL OR ((v_elem->>'technical_skills_rating')::NUMERIC < 1.0 OR ((v_elem->>'technical_skills_rating')::NUMERIC > 5.0)) THEN
            RAISE EXCEPTION 'Validation Error: Technical Skills Rating out of range (1.0 - 5.0) for student %.', v_elem->>'student_id';
        END IF;
        IF (v_elem->>'placement_readiness_score') IS NULL OR ((v_elem->>'placement_readiness_score')::NUMERIC < 0.0 OR ((v_elem->>'placement_readiness_score')::NUMERIC > 100.0)) THEN
            RAISE EXCEPTION 'Validation Error: Placement Readiness Score out of range (0-100) for student %.', v_elem->>'student_id';
        END IF;
        IF (v_elem->>'backlogs') IS NOT NULL AND ((v_elem->>'backlogs')::INTEGER < 0 OR ((v_elem->>'backlogs')::INTEGER > 30) THEN
            RAISE EXCEPTION 'Validation Error: Backlogs out of range (0-30) for student %.', v_elem->>'student_id';
        END IF;

        -- 5. Pass 3: Cross-Record Email Collision & Identity Conflict Checks
        IF EXISTS (
            SELECT 1 FROM public.students
            WHERE pg_catalog.lower(trim(email)) = pg_catalog.lower(trim(v_elem->>'email'))
              AND student_id != (v_elem->>'student_id')
        ) THEN
            RAISE EXCEPTION 'Email Collision: Email % is already registered to another student.', v_elem->>'email';
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.students
            WHERE student_id = (v_elem->>'student_id')
              AND profile_id IS NOT NULL
              AND pg_catalog.lower(trim(email)) != pg_catalog.lower(trim(v_elem->>'email'))
        ) THEN
            RAISE EXCEPTION 'Identity Conflict Exception: Student % is linked to an account with a different email.', v_elem->>'student_id';
        END IF;
    END LOOP;

    -- 6. Pass 4: Atomic Batch Upsert (Trigger calculates derived metrics authoritatively)
    INSERT INTO public.students (
        student_id, name, email, department, semester, cgpa,
        attendance_rate, assignment_score, engagement_score,
        technical_skills_rating, placement_readiness_score,
        internship_completed, backlogs, feedback,
        is_synthetic
    )
    SELECT
        (elem->>'student_id')::TEXT,
        (elem->>'name')::TEXT,
        pg_catalog.lower(trim(elem->>'email'))::TEXT,
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
        false -- Real imported cohort
    FROM pg_catalog.jsonb_array_elements(p_students) AS elem
    ON CONFLICT (student_id) DO UPDATE SET
        name = EXCLUDED.name,
        department = EXCLUDED.department,
        semester = EXCLUDED.semester,
        cgpa = EXCLUDED.cgpa,
        engagement_score = EXCLUDED.engagement_score,
        technical_skills_rating = EXCLUDED.technical_skills_rating,
        placement_readiness_score = EXCLUDED.placement_readiness_score,
        internship_completed = EXCLUDED.internship_completed,
        backlogs = EXCLUDED.backlogs,
        -- Preservation of faculty feedback on existing records:
        feedback = COALESCE(public.students.feedback, EXCLUDED.feedback),
        -- Preservation of teacher-maintained marks on existing records:
        attendance_rate = public.students.attendance_rate,
        assignment_score = public.students.assignment_score,
        -- Preservation of linked identities and classes:
        email = CASE WHEN public.students.profile_id IS NOT NULL THEN public.students.email ELSE EXCLUDED.email END,
        profile_id = public.students.profile_id,
        class_id = public.students.class_id,
        is_synthetic = false,
        updated_at = pg_catalog.clock_timestamp();

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- 7. Audit Log Entry (target_id is explicitly populated to satisfy NOT NULL constraint)
    v_target_batch_id := 'COHORT_BATCH_' || pg_catalog.to_char(pg_catalog.clock_timestamp(), 'YYYYMMDD_HH24MISS');

    INSERT INTO public.audit_logs (actor_id, action, target_table, target_id, old_data, new_data)
    VALUES (
        auth.uid(),
        'ADMIN_CSV_UPSERT',
        'students',
        v_target_batch_id,
        pg_catalog.jsonb_build_object('affected_students_count', v_count),
        pg_catalog.jsonb_build_object('upserted_rows', v_count, 'batch_id', v_target_batch_id, 'timestamp', pg_catalog.clock_timestamp())
    );

    RETURN pg_catalog.jsonb_build_object('success', true, 'count', v_count, 'batch_id', v_target_batch_id);
END;
$$;

ALTER FUNCTION public.upsert_student_cohort(JSONB) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.upsert_student_cohort(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_student_cohort(JSONB) TO authenticated;

-- 14. Last-Admin Concurrency Safe Role/Status Mutation Procedure (NULL-Safe Authorization)
CREATE OR REPLACE FUNCTION public.admin_set_user_role_and_status(
    p_target_user_id UUID,
    p_new_role TEXT,
    p_new_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_old_role TEXT;
    v_old_is_active BOOLEAN;
    v_admin_count INTEGER;
    LOCK_KEY CONSTANT BIGINT := 8472910384721;
BEGIN
    -- 1. NULL-Safe Caller Verification Check
    IF auth.uid() IS NULL OR public.get_auth_role() IS NULL OR public.get_auth_role() != 'admin' THEN
        RAISE EXCEPTION 'Authorization Error: Caller is not an active Administrator.';
    END IF;

    -- 2. Validate new role and status parameters
    IF p_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Validation Error: target_user_id cannot be null.';
    END IF;
    IF p_new_role NOT IN ('student', 'teacher', 'admin') THEN
        RAISE EXCEPTION 'Validation Error: Invalid role % specified.', p_new_role;
    END IF;
    IF p_new_is_active IS NULL THEN
        RAISE EXCEPTION 'Validation Error: is_active cannot be null.';
    END IF;

    -- 3. Acquire Advisory Lock to serialize admin role mutations
    PERFORM pg_catalog.pg_advisory_xact_lock(LOCK_KEY);

    -- 4. Re-read target state under lock
    SELECT role, is_active
    INTO v_old_role, v_old_is_active
    FROM public.profiles
    WHERE id = p_target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user % not found in profiles.', p_target_user_id;
    END IF;

    -- 5. Invariant Assertion: Prevent last-admin demotion or deactivation
    IF v_old_role = 'admin' AND v_old_is_active = true AND (p_new_role != 'admin' OR p_new_is_active = false) THEN
        SELECT count(*) INTO v_admin_count
        FROM public.profiles
        WHERE role = 'admin' AND is_active = true AND id != p_target_user_id;

        IF v_admin_count < 1 THEN
            RAISE EXCEPTION 'Safety Invariant Violation: Operation would leave zero active Administrators.';
        END IF;
    END IF;

    -- 6. Execute update
    UPDATE public.profiles
    SET role = p_new_role,
        is_active = p_new_is_active,
        updated_at = pg_catalog.clock_timestamp()
    WHERE id = p_target_user_id;

    -- 7. Audit log (atomic with target_id)
    INSERT INTO public.audit_logs (actor_id, action, target_table, target_id, old_data, new_data)
    VALUES (
        auth.uid(),
        'ADMIN_USER_MUTATION',
        'profiles',
        p_target_user_id::TEXT,
        pg_catalog.jsonb_build_object('role', v_old_role, 'is_active', v_old_is_active),
        pg_catalog.jsonb_build_object('role', p_new_role, 'is_active', p_new_is_active)
    );

    RETURN pg_catalog.jsonb_build_object('success', true, 'target_id', p_target_user_id);
END;
$$;

ALTER FUNCTION public.admin_set_user_role_and_status(UUID, TEXT, BOOLEAN) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_set_user_role_and_status(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role_and_status(UUID, TEXT, BOOLEAN) TO authenticated;

COMMIT;
