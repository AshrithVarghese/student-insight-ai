-- ============================================================
-- Student Insight AI — Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

-- ---------- Profiles (extends auth.users) ----------
-- Holds ADMIN / FACULTY role information for authenticated users.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'FACULTY')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Students ----------
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  department TEXT NOT NULL,
  batch TEXT NOT NULL,
  date_of_birth DATE,
  phone TEXT,
  profile_photo_url TEXT,
  face_embedding BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_batch ON public.students(batch);
CREATE INDEX IF NOT EXISTS idx_students_department ON public.students(department);

-- ---------- Semesters ----------
CREATE TABLE IF NOT EXISTS public.semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  semester_number INTEGER NOT NULL CHECK (semester_number > 0),
  sgpa DECIMAL(4,2) CHECK (sgpa >= 0 AND sgpa <= 10),
  cgpa DECIMAL(4,2) CHECK (cgpa >= 0 AND cgpa <= 10),
  academic_year TEXT NOT NULL,
  UNIQUE(student_id, semester_number)
);

CREATE INDEX IF NOT EXISTS idx_semesters_student ON public.semesters(student_id);

-- ---------- Subjects ----------
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  department TEXT NOT NULL
);

-- ---------- Subject Results ----------
CREATE TABLE IF NOT EXISTS public.subject_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  marks INTEGER CHECK (marks >= 0 AND marks <= 100),
  grade TEXT,
  grade_point DECIMAL(4,2) CHECK (grade_point >= 0 AND grade_point <= 10),
  UNIQUE(student_id, semester_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_results_student ON public.subject_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_semester ON public.subject_results(semester_id);

-- ---------- Attendance ----------
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  classes_held INTEGER NOT NULL DEFAULT 0 CHECK (classes_held >= 0),
  classes_attended INTEGER NOT NULL DEFAULT 0 CHECK (classes_attended >= 0 AND classes_attended <= classes_held),
  percentage DECIMAL(5,2) CHECK (percentage >= 0 AND percentage <= 100),
  UNIQUE(student_id, semester_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);

-- ---------- Skills ----------
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  proficiency TEXT NOT NULL DEFAULT 'Intermediate'
    CHECK (proficiency IN ('Beginner', 'Intermediate', 'Advanced', 'Expert'))
);

CREATE INDEX IF NOT EXISTS idx_skills_student ON public.skills(student_id);

-- ---------- Projects ----------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  technologies TEXT[],
  role TEXT,
  date DATE
);

CREATE INDEX IF NOT EXISTS idx_projects_student ON public.projects(student_id);

-- ---------- Certifications ----------
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT,
  issue_date DATE,
  credential_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_certifications_student ON public.certifications(student_id);

-- ---------- Achievements ----------
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE
);

CREATE INDEX IF NOT EXISTS idx_achievements_student ON public.achievements(student_id);

-- ---------- Extracurricular Activities ----------
CREATE TABLE IF NOT EXISTS public.extracurricular_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  activity TEXT NOT NULL,
  role TEXT,
  date DATE,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_activities_student ON public.extracurricular_activities(student_id);

-- ---------- Conduct Records ----------
CREATE TABLE IF NOT EXISTS public.conduct_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  date DATE,
  status TEXT
);

CREATE INDEX IF NOT EXISTS idx_conduct_student ON public.conduct_records(student_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracurricular_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conduct_records ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an ADMIN?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- Helper: is the current user authenticated?
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT auth.role() = 'authenticated';
$$;

-- ---------- Profiles ----------
-- Users can view their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ---------- Students ----------
DROP POLICY IF EXISTS "students_select_authenticated" ON public.students;
CREATE POLICY "students_select_authenticated" ON public.students
  FOR SELECT USING (public.is_authenticated());

DROP POLICY IF EXISTS "students_insert_admin" ON public.students;
CREATE POLICY "students_insert_admin" ON public.students
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "students_update_admin" ON public.students;
CREATE POLICY "students_update_admin" ON public.students
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "students_delete_admin" ON public.students;
CREATE POLICY "students_delete_admin" ON public.students
  FOR DELETE USING (public.is_admin());

-- ---------- Generic read policies (authenticated users) ----------
CREATE OR REPLACE FUNCTION public.create_read_policy(table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'DROP POLICY IF EXISTS %I ON public.%I;',
    table_name || '_select_authenticated',
    table_name
  );
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_authenticated());',
    table_name || '_select_authenticated',
    table_name
  );
END;
$$;

-- ---------- Semesters ----------
SELECT public.create_read_policy('semesters');

DROP POLICY IF EXISTS "semesters_insert_admin" ON public.semesters;
CREATE POLICY "semesters_insert_admin" ON public.semesters
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "semesters_update_admin" ON public.semesters;
CREATE POLICY "semesters_update_admin" ON public.semesters
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "semesters_delete_admin" ON public.semesters;
CREATE POLICY "semesters_delete_admin" ON public.semesters
  FOR DELETE USING (public.is_admin());

-- ---------- Subjects ----------
SELECT public.create_read_policy('subjects');

DROP POLICY IF EXISTS "subjects_insert_admin" ON public.subjects;
CREATE POLICY "subjects_insert_admin" ON public.subjects
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "subjects_update_admin" ON public.subjects;
CREATE POLICY "subjects_update_admin" ON public.subjects
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "subjects_delete_admin" ON public.subjects;
CREATE POLICY "subjects_delete_admin" ON public.subjects
  FOR DELETE USING (public.is_admin());

-- ---------- Subject Results ----------
SELECT public.create_read_policy('subject_results');

DROP POLICY IF EXISTS "subject_results_insert_admin" ON public.subject_results;
CREATE POLICY "subject_results_insert_admin" ON public.subject_results
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "subject_results_update_admin" ON public.subject_results;
CREATE POLICY "subject_results_update_admin" ON public.subject_results
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "subject_results_delete_admin" ON public.subject_results;
CREATE POLICY "subject_results_delete_admin" ON public.subject_results
  FOR DELETE USING (public.is_admin());

-- ---------- Attendance ----------
SELECT public.create_read_policy('attendance');

DROP POLICY IF EXISTS "attendance_insert_admin" ON public.attendance;
CREATE POLICY "attendance_insert_admin" ON public.attendance
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "attendance_update_admin" ON public.attendance;
CREATE POLICY "attendance_update_admin" ON public.attendance
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "attendance_delete_admin" ON public.attendance;
CREATE POLICY "attendance_delete_admin" ON public.attendance
  FOR DELETE USING (public.is_admin());

-- ---------- Skills ----------
SELECT public.create_read_policy('skills');

DROP POLICY IF EXISTS "skills_insert_admin" ON public.skills;
CREATE POLICY "skills_insert_admin" ON public.skills
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "skills_update_admin" ON public.skills;
CREATE POLICY "skills_update_admin" ON public.skills
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "skills_delete_admin" ON public.skills;
CREATE POLICY "skills_delete_admin" ON public.skills
  FOR DELETE USING (public.is_admin());

-- ---------- Projects ----------
SELECT public.create_read_policy('projects');

DROP POLICY IF EXISTS "projects_insert_admin" ON public.projects;
CREATE POLICY "projects_insert_admin" ON public.projects
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "projects_update_admin" ON public.projects;
CREATE POLICY "projects_update_admin" ON public.projects
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "projects_delete_admin" ON public.projects;
CREATE POLICY "projects_delete_admin" ON public.projects
  FOR DELETE USING (public.is_admin());

-- ---------- Certifications ----------
SELECT public.create_read_policy('certifications');

DROP POLICY IF EXISTS "certifications_insert_admin" ON public.certifications;
CREATE POLICY "certifications_insert_admin" ON public.certifications
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "certifications_update_admin" ON public.certifications;
CREATE POLICY "certifications_update_admin" ON public.certifications
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "certifications_delete_admin" ON public.certifications;
CREATE POLICY "certifications_delete_admin" ON public.certifications
  FOR DELETE USING (public.is_admin());

-- ---------- Achievements ----------
SELECT public.create_read_policy('achievements');

DROP POLICY IF EXISTS "achievements_insert_admin" ON public.achievements;
CREATE POLICY "achievements_insert_admin" ON public.achievements
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "achievements_update_admin" ON public.achievements;
CREATE POLICY "achievements_update_admin" ON public.achievements
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "achievements_delete_admin" ON public.achievements;
CREATE POLICY "achievements_delete_admin" ON public.achievements
  FOR DELETE USING (public.is_admin());

-- ---------- Extracurricular Activities ----------
SELECT public.create_read_policy('extracurricular_activities');

DROP POLICY IF EXISTS "extracurricular_activities_insert_admin" ON public.extracurricular_activities;
CREATE POLICY "extracurricular_activities_insert_admin" ON public.extracurricular_activities
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "extracurricular_activities_update_admin" ON public.extracurricular_activities;
CREATE POLICY "extracurricular_activities_update_admin" ON public.extracurricular_activities
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "extracurricular_activities_delete_admin" ON public.extracurricular_activities;
CREATE POLICY "extracurricular_activities_delete_admin" ON public.extracurricular_activities
  FOR DELETE USING (public.is_admin());

-- ---------- Conduct Records ----------
-- Conduct records are more sensitive. Only ADMIN can read and write.
DROP POLICY IF EXISTS "conduct_records_select_admin" ON public.conduct_records;
CREATE POLICY "conduct_records_select_admin" ON public.conduct_records
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "conduct_records_insert_admin" ON public.conduct_records;
CREATE POLICY "conduct_records_insert_admin" ON public.conduct_records
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "conduct_records_update_admin" ON public.conduct_records;
CREATE POLICY "conduct_records_update_admin" ON public.conduct_records
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "conduct_records_delete_admin" ON public.conduct_records;
CREATE POLICY "conduct_records_delete_admin" ON public.conduct_records
  FOR DELETE USING (public.is_admin());

-- ============================================================
-- SEED DATA
-- ============================================================

-- Seed subjects (common CS department subjects)
INSERT INTO public.subjects (code, name, credits, department)
SELECT * FROM (VALUES
  ('CS101', 'Programming Fundamentals', 4, 'Computer Science'),
  ('CS102', 'Data Structures & Algorithms', 4, 'Computer Science'),
  ('CS201', 'Database Management Systems', 3, 'Computer Science'),
  ('CS202', 'Operating Systems', 3, 'Computer Science'),
  ('CS203', 'Object-Oriented Programming', 3, 'Computer Science'),
  ('CS301', 'Computer Networks', 3, 'Computer Science'),
  ('CS302', 'Software Engineering', 3, 'Computer Science'),
  ('CS303', 'Machine Learning', 4, 'Computer Science'),
  ('MA101', 'Engineering Mathematics I', 4, 'Mathematics'),
  ('MA102', 'Engineering Mathematics II', 4, 'Mathematics')
) AS seed(code, name, credits, department)
WHERE NOT EXISTS (SELECT 1 FROM public.subjects LIMIT 1);

-- ============================================================
-- Creates a new admin user in auth.users and links their profile.
-- Replace the email/password before running.
-- ============================================================
-- INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated',
--   'authenticated',
--   'admin@institution.edu',
--   crypt('SuperSecret123!', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW()
-- );

-- ============================================================
-- STORAGE: Student profile photos
-- ============================================================
-- Public bucket for student profile photos. The frontend uploads images
-- here and stores the resulting public URL in students.profile_photo_url.
-- Run this section after creating the bucket (see scripts/create_photo_bucket.py).
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "student_photos_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'student-photos');

CREATE POLICY "student_photos_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'student-photos' AND public.is_admin());

CREATE POLICY "student_photos_admin_update"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'student-photos')
  WITH CHECK (bucket_id = 'student-photos' AND public.is_admin());

CREATE POLICY "student_photos_admin_delete"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'student-photos' AND public.is_admin());

-- ============================================================
-- NOTES
-- ============================================================
-- 1. After running this schema, create your first user through
--    Supabase Dashboard > Authentication > Users > Add user.
-- 2. Then run the following to assign the ADMIN role:
--
--   INSERT INTO public.profiles (id, name, role)
--   SELECT id, COALESCE(raw_user_meta_data->>'name', 'Admin'), 'ADMIN'
--   FROM auth.users
--   WHERE email = 'you@institution.edu';
--
-- 3. Conduct records are ADMIN-only. Faculty cannot see them.
-- 4. Face embeddings are stored encrypted in BYTEA and never
--    returned by any RLS policy via selection.
-- ============================================================