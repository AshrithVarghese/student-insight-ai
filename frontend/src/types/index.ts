// Database entity types matching the Supabase schema

export type UserRole = 'ADMIN' | 'FACULTY'

export interface Profile {
  id: string
  name: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  student_id: string
  name: string
  email: string | null
  department: string
  batch: string
  date_of_birth: string | null
  phone: string | null
  profile_photo_url: string | null
  created_at: string
  updated_at: string
}

export interface Semester {
  id: string
  student_id: string
  semester_number: number
  sgpa: number | null
  cgpa: number | null
  academic_year: string
}

export interface Subject {
  id: string
  code: string
  name: string
  credits: number
  department: string
}

export interface SubjectResult {
  id: string
  student_id: string
  semester_id: string
  subject_id: string
  marks: number | null
  grade: string | null
  grade_point: number | null
  subject?: Subject
  semester?: Semester
}

export interface Attendance {
  id: string
  student_id: string
  semester_id: string
  subject_id: string
  classes_held: number
  classes_attended: number
  percentage: number | null
  subject?: Subject
}

export interface Skill {
  id: string
  student_id: string
  skill_name: string
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
}

export interface Project {
  id: string
  student_id: string
  title: string
  description: string | null
  technologies: string[] | null
  role: string | null
  date: string | null
}

export interface Certification {
  id: string
  student_id: string
  name: string
  issuer: string | null
  issue_date: string | null
  credential_url: string | null
}

export interface Achievement {
  id: string
  student_id: string
  title: string
  description: string | null
  date: string | null
}

export interface ExtracurricularActivity {
  id: string
  student_id: string
  activity: string
  role: string | null
  date: string | null
  description: string | null
}

export interface ConductRecord {
  id: string
  student_id: string
  type: string
  description: string | null
  date: string | null
  status: string | null
}

// Analytics types

export type Trend = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'NO_DATA'
export type Consistency = 'HIGH' | 'MEDIUM' | 'LOW' | 'N/A'

export interface StudentAnalytics {
  trend: Trend
  trendReason?: string
  currentSgpa: number | null
  currentCgpa: number | null
  cgpaChange: number | null
  gpaChangeRate: number | null
  attendanceAverage: number | null
  subjectAverage: number | null
  subjectVariance: number | null
  strongSubjects: string[]
  weakSubjects: string[]
  performanceConsistency: Consistency
  recentPerformance: number[]
  projectCount: number
  certificationCount: number
  achievementCount: number
}

// Career recommendation types

export interface CareerRecommendation {
  role: string
  score: number
  matchedFactors: string[]
  explanation?: string
}

// Prediction types

export interface CgpaPrediction {
  predictedCgpa: number | null
  modelVersion: string | null
  status: 'AVAILABLE' | 'INSUFFICIENT_DATA' | 'MODEL_UNAVAILABLE'
  basedOn?: string[]
}

// Auth types

export interface AuthUser {
  id: string
  email: string
  profile?: Profile
}
