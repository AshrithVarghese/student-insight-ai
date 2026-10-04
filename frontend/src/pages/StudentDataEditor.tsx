import { lazy, Suspense, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  useAchievements,
  useActivities,
  useAttendance,
  useCertifications,
  useConductRecords,
  useProjects,
  useResults,
  useSemesters,
  useSkills,
  useStudent,
  useSubjects,
} from '../hooks/useStudents'
import { LoadingState } from '../components/ui/LoadingState'
import { Spinner } from '../components/ui/LoadingState'
import type {
  Achievement,
  Attendance,
  Certification,
  ConductRecord,
  ExtracurricularActivity,
  Project,
  Semester,
  Skill,
  SubjectResult,
} from '../types'

const TranscriptImport = lazy(() => import('../components/student/TranscriptImport'))

interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'number' | 'textarea' | 'date' | 'select' | 'url'
  required?: boolean
  placeholder?: string
  step?: string
  hint?: string
  options?: { value: string; label: string }[]
}

interface SectionEditorProps<T> {
  title: string
  description: string
  table: string
  queryKey: string[]
  fields: FieldDef[]
  rows: T[]
  buildPayload: (values: Record<string, string>) => Record<string, unknown>
  rowLabel: (row: T) => string
  emptyText?: string
}

function SectionEditor<T>({
  title,
  description,
  table,
  queryKey,
  fields,
  rows,
  buildPayload,
  rowLabel,
  emptyText = 'No records yet.',
}: SectionEditorProps<T>) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, ''])),
  )
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const inputClass =
    'mt-1 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => {
    setValues(Object.fromEntries(fields.map((f) => [f.key, ''])))
  }

  const handleAdd = async () => {
    setError(null)
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        setError(`${f.label} is required.`)
        return
      }
    }

    setSaving(true)
    try {
      const { error: insertError } = await supabase
        .from(table)
        .insert(buildPayload(values))
      if (insertError) throw new Error(insertError.message)
      await queryClient.invalidateQueries({ queryKey })
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: T) => {
    const id = (row as { id?: string }).id
    if (!id) return
    if (!window.confirm('Delete this record?')) return

    setDeletingId(id)
    setError(null)
    try {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
      if (deleteError) throw new Error(deleteError.message)
      await queryClient.invalidateQueries({ queryKey })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{description}</p>
      </div>

      {rows.length > 0 ? (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
          {rows.map((row) => {
            const id = (row as { id?: string }).id
            return (
              <li key={id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <span className="min-w-0 flex-1 text-sm text-gray-700">{rowLabel(row)}</span>
                <button
                  type="button"
                  disabled={deletingId === id}
                  onClick={() => handleDelete(row)}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingId === id ? '...' : 'Remove'}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mb-3 rounded-lg border border-dashed border-gray-200 px-4 py-4 text-center text-sm text-gray-400">
          {emptyText}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <label htmlFor={`${table}-${field.key}`} className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
            </label>
            {field.type === 'select' ? (
              <select
                id={`${table}-${field.key}`}
                value={values[field.key]}
                onChange={(e) => setValue(field.key, e.target.value)}
                className={inputClass}
              >
                <option value="">Select...</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                id={`${table}-${field.key}`}
                rows={3}
                value={values[field.key]}
                onChange={(e) => setValue(field.key, e.target.value)}
                className={inputClass}
                placeholder={field.placeholder}
              />
            ) : (
              <input
                id={`${table}-${field.key}`}
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'url' ? 'url' : 'text'}
                value={values[field.key]}
                onChange={(e) => setValue(field.key, e.target.value)}
                className={inputClass}
                placeholder={field.placeholder}
                step={field.step}
              />
            )}
            {field.hint && <p className="mt-1 text-xs text-gray-400">{field.hint}</p>}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && <Spinner className="h-4 w-4 text-white" />}
          {saving ? 'Adding...' : `Add ${title}`}
        </button>
      </div>
    </div>
  )
}

export default function StudentDataEditor() {
  const { studentId } = useParams()
  const studentQuery = useStudent(studentId ?? '')
  const uuid = studentQuery.data?.id

  const semestersQuery = useSemesters(uuid)
  const resultsQuery = useResults(uuid)
  const attendanceQuery = useAttendance(uuid)
  const skillsQuery = useSkills(uuid)
  const projectsQuery = useProjects(uuid)
  const certificationsQuery = useCertifications(uuid)
  const achievementsQuery = useAchievements(uuid)
  const activitiesQuery = useActivities(uuid)
  const conductQuery = useConductRecords(uuid)
  const subjectsQuery = useSubjects()

  const semesterOptions = (semestersQuery.data ?? []).map((s) => ({
    value: s.id,
    label: `Semester ${s.semester_number}`,
  }))

  const subjectOptions = (subjectsQuery.data ?? []).map((s) => ({
    value: s.id,
    label: `${s.code} — ${s.name}`,
  }))

  if (studentQuery.isLoading) {
    return <LoadingState message="Loading student..." />
  }

  if (!studentQuery.data) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-gray-500">
        Student not found.
      </div>
    )
  }

  const student = studentQuery.data

  const toNumber = (value: string, fallback: number | null = null) =>
    value === '' || value == null ? fallback : Number(value)

  const PROFICIENCIES = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Data — {student.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {student.student_id} · {student.department} · Batch {student.batch}
        </p>
        <p className="mt-3 text-sm text-gray-500">
          Add academic and co-curricular records. Existing entries are listed below each section.
        </p>
      </div>

      <div className="space-y-6">
        <Suspense
          fallback={
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-6 text-sm text-gray-500">
              Loading transcript import...
            </div>
          }
        >
          <TranscriptImport
            studentId={student.student_id}
            studentName={student.name}
            studentUuid={uuid ?? ''}
          />
        </Suspense>

        <SectionEditor
          title="Semester"
          description="One entry per semester. Used for CGPA trend charts and prediction."
          table="semesters"
          queryKey={['semesters']}
          rows={semestersQuery.data ?? []}
          fields={[
            { key: 'semester_number', label: 'Semester Number', type: 'number', required: true, step: '1' },
            { key: 'sgpa', label: 'SGPA', type: 'number', step: '0.01', hint: '0 - 10' },
            { key: 'cgpa', label: 'CGPA', type: 'number', step: '0.01', hint: '0 - 10' },
            { key: 'academic_year', label: 'Academic Year', required: true, placeholder: 'e.g. 2024-2025' },
          ]}
          buildPayload={(v) => ({
            student_id: uuid,
            semester_number: toNumber(v.semester_number) ?? 0,
            sgpa: toNumber(v.sgpa),
            cgpa: toNumber(v.cgpa),
            academic_year: v.academic_year,
          })}
          rowLabel={(row: Semester) =>
            `Semester ${row.semester_number} — SGPA ${row.sgpa ?? '—'} · CGPA ${row.cgpa ?? '—'} (${row.academic_year})`
          }
        />

        <SectionEditor
          title="Subject Result"
          description="Marks/grade per subject per semester. Add semesters and subjects first."
          table="subject_results"
          queryKey={['results']}
          rows={resultsQuery.data ?? []}
          fields={[
            { key: 'semester_id', label: 'Semester', type: 'select', required: true, options: semesterOptions },
            { key: 'subject_id', label: 'Subject', type: 'select', required: true, options: subjectOptions },
            { key: 'marks', label: 'Marks', type: 'number', step: '1', hint: '0 - 100' },
            { key: 'grade', label: 'Grade', placeholder: 'e.g. A+, B, C' },
            { key: 'grade_point', label: 'Grade Point', type: 'number', step: '0.01', hint: '0 - 10' },
          ]}
          buildPayload={(v) => ({
            student_id: uuid,
            semester_id: v.semester_id,
            subject_id: v.subject_id,
            marks: toNumber(v.marks),
            grade: v.grade || null,
            grade_point: toNumber(v.grade_point),
          })}
          rowLabel={(row: SubjectResult) => {
            const subject = row.subject ? `${row.subject.code} ${row.subject.name}` : row.subject_id
            const semester = row.semester ? ` · Sem ${row.semester.semester_number}` : ''
            return `${subject} — ${row.marks ?? '—'}%${row.grade ? ` (${row.grade})` : ''}${semester}`
          }}
        />

        <SectionEditor
          title="Attendance"
          description="Classes held/attended per subject per semester. Percentage is auto-calculated."
          table="attendance"
          queryKey={['attendance']}
          rows={attendanceQuery.data ?? []}
          fields={[
            { key: 'semester_id', label: 'Semester', type: 'select', required: true, options: semesterOptions },
            { key: 'subject_id', label: 'Subject', type: 'select', required: true, options: subjectOptions },
            { key: 'classes_held', label: 'Classes Held', type: 'number', required: true, step: '1' },
            { key: 'classes_attended', label: 'Classes Attended', type: 'number', required: true, step: '1' },
          ]}
          buildPayload={(v) => {
            const held = toNumber(v.classes_held) ?? 0
            const attended = toNumber(v.classes_attended) ?? 0
            const percentage = held > 0 ? Math.round((attended / held) * 10000) / 100 : null
            return {
              student_id: uuid,
              semester_id: v.semester_id,
              subject_id: v.subject_id,
              classes_held: held,
              classes_attended: attended,
              percentage,
            }
          }}
          rowLabel={(row: Attendance) => {
            const subject = row.subject ? `${row.subject.code} ${row.subject.name}` : row.subject_id
            return `${subject} — ${row.classes_attended}/${row.classes_held}${row.percentage != null ? ` (${row.percentage}%)` : ''}`
          }}
        />

        <SectionEditor
          title="Skill"
          description="Technical and professional skills with proficiency."
          table="skills"
          queryKey={['skills']}
          rows={skillsQuery.data ?? []}
          fields={[
            { key: 'skill_name', label: 'Skill Name', required: true, placeholder: 'e.g. Python' },
            { key: 'proficiency', label: 'Proficiency', type: 'select', required: true, options: PROFICIENCIES.map((p) => ({ value: p, label: p })) },
          ]}
          buildPayload={(v) => ({
            student_id: uuid,
            skill_name: v.skill_name,
            proficiency: v.proficiency,
          })}
          rowLabel={(row: Skill) => `${row.skill_name} — ${row.proficiency}`}
        />

        <SectionEditor
          title="Project"
          description="Projects contribute to analytics and career recommendations."
          table="projects"
          queryKey={['projects']}
          rows={projectsQuery.data ?? []}
          fields={[
            { key: 'title', label: 'Title', required: true },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'technologies', label: 'Technologies', placeholder: 'Comma separated, e.g. React, Node.js, PostgreSQL' },
            { key: 'role', label: 'Role', placeholder: 'e.g. Lead Developer' },
            { key: 'date', label: 'Date', type: 'date' },
          ]}
          buildPayload={(v) => ({
            student_id: uuid,
            title: v.title,
            description: v.description || null,
            technologies: v.technologies
              ? v.technologies.split(',').map((s) => s.trim()).filter(Boolean)
              : [],
            role: v.role || null,
            date: v.date || null,
          })}
          rowLabel={(row: Project) => `${row.title}${row.role ? ` — ${row.role}` : ''}${row.date ? ` (${row.date})` : ''}`}
        />

        <SectionEditor
          title="Certification"
          description="Certifications and their issuing organisation."
          table="certifications"
          queryKey={['certifications']}
          rows={certificationsQuery.data ?? []}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'issuer', label: 'Issuer' },
            { key: 'issue_date', label: 'Issue Date', type: 'date' },
            { key: 'credential_url', label: 'Credential URL', type: 'url' },
          ]}
          buildPayload={(v) => ({
            student_id: uuid,
            name: v.name,
            issuer: v.issuer || null,
            issue_date: v.issue_date || null,
            credential_url: v.credential_url || null,
          })}
          rowLabel={(row: Certification) => `${row.name}${row.issuer ? ` — ${row.issuer}` : ''}${row.issue_date ? ` (${row.issue_date})` : ''}`}
        />

        <SectionEditor
          title="Achievement"
          description="Awards and notable achievements."
          table="achievements"
          queryKey={['achievements']}
          rows={achievementsQuery.data ?? []}
          fields={[
            { key: 'title', label: 'Title', required: true },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'date', label: 'Date', type: 'date' },
          ]}
          buildPayload={(v) => ({
            student_id: uuid,
            title: v.title,
            description: v.description || null,
            date: v.date || null,
          })}
          rowLabel={(row: Achievement) => `${row.title}${row.date ? ` (${row.date})` : ''}`}
        />

        <SectionEditor
          title="Activity"
          description="Extracurricular activities such as clubs, sports, and volunteering."
          table="extracurricular_activities"
          queryKey={['activities']}
          rows={activitiesQuery.data ?? []}
          fields={[
            { key: 'activity', label: 'Activity', required: true },
            { key: 'role', label: 'Role' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'description', label: 'Description', type: 'textarea' },
          ]}
          buildPayload={(v) => ({
            student_id: uuid,
            activity: v.activity,
            role: v.role || null,
            date: v.date || null,
            description: v.description || null,
          })}
          rowLabel={(row: ExtracurricularActivity) => `${row.activity}${row.role ? ` — ${row.role}` : ''}`}
        />

        <SectionEditor
          title="Conduct Record"
          description="Sensitive records. Only visible to administrators."
          table="conduct_records"
          queryKey={['conduct']}
          rows={conductQuery.data ?? []}
          fields={[
            { key: 'type', label: 'Type', required: true, placeholder: 'e.g. Appreciation, Warning' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'status', label: 'Status', placeholder: 'e.g. Active, Resolved' },
          ]}
          buildPayload={(v) => ({
            student_id: uuid,
            type: v.type,
            description: v.description || null,
            date: v.date || null,
            status: v.status || null,
          })}
          rowLabel={(row: ConductRecord) => `${row.type}${row.description ? ` — ${row.description}` : ''}${row.date ? ` (${row.date})` : ''}`}
        />
      </div>

      <div className="pb-6">
        <Link
          to={`/students/${student.student_id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to profile
        </Link>
      </div>
    </div>
  )
}