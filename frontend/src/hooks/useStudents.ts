import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type {
  Achievement,
  Attendance,
  Certification,
  ConductRecord,
  ExtracurricularActivity,
  Project,
  Semester,
  Skill,
  Student,
  StudentAnalytics,
  Subject,
  SubjectResult,
} from '../types'

async function fetchStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return (data as Student[]) ?? []
}

async function fetchStudent(studentId: string): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', studentId)
    .single()
  if (error) throw new Error(error.message)
  return data as Student
}

async function fetchSemesters(uuid: string): Promise<Semester[]> {
  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .eq('student_id', uuid)
    .order('semester_number', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as Semester[]) ?? []
}

async function fetchResults(uuid: string): Promise<SubjectResult[]> {
  const { data, error } = await supabase
    .from('subject_results')
    .select('*, subject:subjects(*), semester:semesters(*)')
    .eq('student_id', uuid)
  if (error) throw new Error(error.message)
  return (data as SubjectResult[]) ?? []
}

async function fetchAttendance(uuid: string): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, subject:subjects(*)')
    .eq('student_id', uuid)
  if (error) throw new Error(error.message)
  return (data as Attendance[]) ?? []
}

async function fetchSkills(uuid: string): Promise<Skill[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('student_id', uuid)
    .order('proficiency', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Skill[]) ?? []
}

async function fetchProjects(uuid: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('student_id', uuid)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Project[]) ?? []
}

async function fetchCertifications(uuid: string): Promise<Certification[]> {
  const { data, error } = await supabase
    .from('certifications')
    .select('*')
    .eq('student_id', uuid)
    .order('issue_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Certification[]) ?? []
}

async function fetchAchievements(uuid: string): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('student_id', uuid)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Achievement[]) ?? []
}

async function fetchActivities(uuid: string): Promise<ExtracurricularActivity[]> {
  const { data, error } = await supabase
    .from('extracurricular_activities')
    .select('*')
    .eq('student_id', uuid)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ExtracurricularActivity[]) ?? []
}

async function fetchConductRecords(uuid: string): Promise<ConductRecord[]> {
  const { data, error } = await supabase
    .from('conduct_records')
    .select('*')
    .eq('student_id', uuid)
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ConductRecord[]) ?? []
}

export function useStudents() {
  return useQuery({ queryKey: ['students'], queryFn: fetchStudents })
}

async function fetchSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return (data as Subject[]) ?? []
}

export function useSubjects() {
  return useQuery({ queryKey: ['subjects'], queryFn: fetchSubjects })
}

export function useStudent(studentId: string) {
  return useQuery({
    queryKey: ['student', studentId],
    queryFn: () => fetchStudent(studentId),
    enabled: Boolean(studentId),
  })
}

export function useSemesters(uuid?: string) {
  return useQuery({
    queryKey: ['semesters', uuid],
    queryFn: () => fetchSemesters(uuid!),
    enabled: Boolean(uuid),
  })
}

export function useResults(uuid?: string) {
  return useQuery({
    queryKey: ['results', uuid],
    queryFn: () => fetchResults(uuid!),
    enabled: Boolean(uuid),
  })
}

export function useAttendance(uuid?: string) {
  return useQuery({
    queryKey: ['attendance', uuid],
    queryFn: () => fetchAttendance(uuid!),
    enabled: Boolean(uuid),
  })
}

export function useSkills(uuid?: string) {
  return useQuery({
    queryKey: ['skills', uuid],
    queryFn: () => fetchSkills(uuid!),
    enabled: Boolean(uuid),
  })
}

export function useProjects(uuid?: string) {
  return useQuery({
    queryKey: ['projects', uuid],
    queryFn: () => fetchProjects(uuid!),
    enabled: Boolean(uuid),
  })
}

export function useCertifications(uuid?: string) {
  return useQuery({
    queryKey: ['certifications', uuid],
    queryFn: () => fetchCertifications(uuid!),
    enabled: Boolean(uuid),
  })
}

export function useAchievements(uuid?: string) {
  return useQuery({
    queryKey: ['achievements', uuid],
    queryFn: () => fetchAchievements(uuid!),
    enabled: Boolean(uuid),
  })
}

export function useActivities(uuid?: string) {
  return useQuery({
    queryKey: ['activities', uuid],
    queryFn: () => fetchActivities(uuid!),
    enabled: Boolean(uuid),
  })
}

export function useConductRecords(uuid?: string) {
  return useQuery({
    queryKey: ['conduct', uuid],
    queryFn: () => fetchConductRecords(uuid!),
    enabled: Boolean(uuid),
  })
}

export function computeAnalytics(
  semesters: Semester[],
  attendance: Attendance[],
  results: SubjectResult[],
  projects: Project[],
  certifications: Certification[],
  achievements: Achievement[],
): StudentAnalytics {
  const sortedSemesters = [...semesters].sort(
    (a, b) => a.semester_number - b.semester_number,
  )

  const currentCgpa = sortedSemesters.at(-1)?.cgpa ?? null
  const prevCgpa =
    sortedSemesters.length >= 2 ? sortedSemesters[sortedSemesters.length - 2].cgpa : null
  const cgpaChange = currentCgpa !== null && prevCgpa !== null ? currentCgpa - prevCgpa : null

  const sgpaSeries = sortedSemesters
    .map((s) => s.sgpa)
    .filter((s): s is number => s !== null && s !== undefined)
  const cgpaSeries = sortedSemesters
    .map((s) => s.cgpa)
    .filter((s): s is number => s !== null && s !== undefined)

  const sgpaSlope = slopeFor(sgpaSeries)
  const cgpaSlope = slopeFor(cgpaSeries)

  let trend: StudentAnalytics['trend'] = 'NO_DATA'
  let trendReason: string | undefined
  if (sgpaSeries.length < 2) {
    trend = 'NO_DATA'
    trendReason =
      sgpaSeries.length === 1
        ? 'Only one semester of SGPA data is available; a trend cannot be established yet.'
        : 'No semester SGPA data is available to establish a trend.'
  } else {
    const direction = trendDirection(sgpaSlope, cgpaSlope)
    trend = direction === 1 ? 'IMPROVING' : direction === -1 ? 'DECLINING' : 'STABLE'
    const sgpaText = sgpaSeries.map((s) => s.toFixed(2)).join(' \u2192 ')
    const cgpaText =
      cgpaSeries.length > 0 ? cgpaSeries.map((s) => s.toFixed(2)).join(' \u2192 ') : 'n/a'
    trendReason = `SGPA progressed ${sgpaText} across ${sgpaSeries.length} semester(s); CGPA moved ${cgpaText}.`
  }

  const gpaChangeRate =
    sgpaSeries.length >= 2
      ? (sgpaSeries[sgpaSeries.length - 1] - sgpaSeries[0]) / (sgpaSeries.length - 1)
      : null

  const validAttendance = attendance.filter((a) => a.percentage !== null)
  const attendanceAverage =
    validAttendance.length > 0
      ? validAttendance.reduce((sum, a) => sum + (a.percentage ?? 0), 0) /
        validAttendance.length
      : null

  const validResults = results.filter((r) => r.marks !== null)
  const subjectMap = new Map<string, number[]>()
  for (const r of validResults) {
    const name = r.subject?.name ?? r.subject_id
    if (r.marks !== null) {
      const arr = subjectMap.get(name) ?? []
      arr.push(r.marks)
      subjectMap.set(name, arr)
    }
  }

  const subjectAverages = [...subjectMap.entries()].map(([name, marks]) => ({
    name,
    avg: marks.reduce((a, b) => a + b, 0) / marks.length,
  }))

  const subjectAverage =
    subjectAverages.length > 0
      ? subjectAverages.reduce((sum, s) => sum + s.avg, 0) / subjectAverages.length
      : null

  const allMarks = validResults
    .map((r) => r.marks ?? 0)
  const mean = allMarks.length > 0 ? allMarks.reduce((a, b) => a + b, 0) / allMarks.length : 0
  const subjectVariance =
    allMarks.length > 0
      ? allMarks.reduce((sum, m) => sum + (m - mean) ** 2, 0) / allMarks.length
      : null

  const sortedSubj = [...subjectAverages].sort((a, b) => b.avg - a.avg)
  const strongSubjects = sortedSubj
    .filter((s) => s.avg >= (subjectAverage ?? 0))
    .slice(0, 3)
    .map((s) => s.name)
  const weakSubjects = sortedSubj
    .filter((s) => s.avg < (subjectAverage ?? 0))
    .slice(-3)
    .reverse()
    .map((s) => s.name)

  let performanceConsistency: StudentAnalytics['performanceConsistency'] = 'N/A'
  if (subjectVariance !== null && subjectAverage !== null) {
    const cv = subjectAverage > 0 ? Math.sqrt(subjectVariance) / subjectAverage : 1
    if (cv < 0.1) performanceConsistency = 'HIGH'
    else if (cv < 0.2) performanceConsistency = 'MEDIUM'
    else performanceConsistency = 'LOW'
  }

  return {
    trend,
    trendReason,
    currentSgpa: sortedSemesters.at(-1)?.sgpa ?? null,
    currentCgpa,
    cgpaChange,
    gpaChangeRate,
    attendanceAverage,
    subjectAverage,
    subjectVariance: subjectVariance !== null ? Math.sqrt(subjectVariance) : null,
    strongSubjects,
    weakSubjects,
    performanceConsistency,
    recentPerformance: sortedSemesters.slice(-3).map((s) => s.sgpa ?? 0),
    projectCount: projects.length,
    certificationCount: certifications.length,
    achievementCount: achievements.length,
  }
}

/** Slope of a best-fit line over index-based points; null for < 2 points. */
function slopeFor(values: number[]): number | null {
  const n = values.length
  if (n < 2) return null
  let num = 0
  let den = 0
  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean)
    den += (i - xMean) ** 2
  }
  return den === 0 ? 0 : num / den
}

/**
 * Trend follows the per-semester SGPA direction first (it reflects actual
 * grade changes); when SGPA is flat, the cumulative CGPA direction decides.
 * Thresholds: SGPA slope > 0.05 / semester, CGPA slope > 0.03 / semester.
 */
function trendDirection(sgpaSlope: number | null, cgpaSlope: number | null): -1 | 0 | 1 {
  const classify = (slope: number, threshold: number): -1 | 0 | 1 =>
    slope > threshold ? 1 : slope < -threshold ? -1 : 0
  const sgpaDir = sgpaSlope === null ? 0 : classify(sgpaSlope, 0.05)
  if (sgpaDir !== 0) return sgpaDir
  return cgpaSlope === null ? 0 : classify(cgpaSlope, 0.03)
}