import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStudent } from '../hooks/useStudents'
import { supabase } from '../lib/supabase'
import { studentSchema } from '../lib/validation'
import { LoadingState } from '../components/ui/LoadingState'
import { Spinner } from '../components/ui/LoadingState'
import PhotoUpload from '../components/PhotoUpload'

export default function StudentForm() {
  const { studentId } = useParams()
  const isEdit = Boolean(studentId)
  const navigate = useNavigate()

  const studentQuery = useStudent(studentId ?? '')

  const [form, setForm] = useState({
    student_id: '',
    name: '',
    email: '',
    department: '',
    batch: '',
    date_of_birth: '',
    phone: '',
    profile_photo_url: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formLoaded, setFormLoaded] = useState(false)

  const fillFormFromStudent = (studentData: {
    student_id: string
    name: string
    email: string | null
    department: string
    batch: string
    date_of_birth: string | null
    phone: string | null
    profile_photo_url: string | null
  }) => {
    setForm({
      student_id: studentData.student_id ?? '',
      name: studentData.name ?? '',
      email: studentData.email ?? '',
      department: studentData.department ?? '',
      batch: studentData.batch ?? '',
      date_of_birth: studentData.date_of_birth ?? '',
      phone: studentData.phone ?? '',
      profile_photo_url: studentData.profile_photo_url ?? '',
    })
    setFormLoaded(true)
  }

  if (isEdit && studentQuery.data && !formLoaded) {
    fillFormFromStudent(studentQuery.data)
  }

  if (isEdit && studentQuery.isLoading) return <LoadingState message="Loading student..." />

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    const parsed = studentSchema.safeParse({
      ...form,
      email: form.email || null,
      date_of_birth: form.date_of_birth || null,
      phone: form.phone || null,
      profile_photo_url: form.profile_photo_url || null,
    })

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string
        if (!fieldErrors[field]) fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setSaving(true)

    try {
      if (isEdit && studentId) {
        const existing = studentQuery.data
        if (!existing) throw new Error('Student not found')

        const { error } = await supabase
          .from('students')
          .update({
            name: form.name,
            email: form.email || null,
            department: form.department,
            batch: form.batch,
            date_of_birth: form.date_of_birth || null,
            phone: form.phone || null,
            profile_photo_url: form.profile_photo_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq('student_id', studentId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('students').insert({
          student_id: form.student_id,
          name: form.name,
          email: form.email || null,
          department: form.department,
          batch: form.batch,
          date_of_birth: form.date_of_birth || null,
          phone: form.phone || null,
          profile_photo_url: form.profile_photo_url || null,
        })

        if (error) throw error
      }

      navigate(`/students/${form.student_id}`)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message.replace('Database error saving new student', '') : String(err),
      )
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = (field: string) =>
    `mt-1 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:ring-2 ${
      errors[field]
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
    }`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Student' : 'Register New Student'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit
            ? `Update information for student ${studentId}`
            : 'Create a new student record in the system.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>
          <p className="mt-0.5 text-sm text-gray-500">Student identity details.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="student_id" className="block text-sm font-medium text-gray-700">
              Student ID <span className="text-red-500">*</span>
            </label>
            <input
              id="student_id"
              type="text"
              value={form.student_id}
              onChange={(e) => handleChange('student_id', e.target.value)}
              disabled={isEdit}
              className={`${fieldClass('student_id')} ${isEdit ? 'cursor-not-allowed bg-gray-50 text-gray-400' : ''}`}
              placeholder="e.g. 2021CS001"
            />
            {errors.student_id && <p className="mt-1 text-xs text-red-600">{errors.student_id}</p>}
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={fieldClass('name')}
              placeholder="e.g. Aditi Sharma"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={fieldClass('email')}
              placeholder="student@institution.edu"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={fieldClass('phone')}
              placeholder="+91 98XXX XXXXX"
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">
              Department <span className="text-red-500">*</span>
            </label>
            <input
              id="department"
              type="text"
              value={form.department}
              onChange={(e) => handleChange('department', e.target.value)}
              className={fieldClass('department')}
              placeholder="e.g. Computer Science"
            />
            {errors.department && <p className="mt-1 text-xs text-red-600">{errors.department}</p>}
          </div>

          <div>
            <label htmlFor="batch" className="block text-sm font-medium text-gray-700">
              Batch <span className="text-red-500">*</span>
            </label>
            <input
              id="batch"
              type="text"
              value={form.batch}
              onChange={(e) => handleChange('batch', e.target.value)}
              className={fieldClass('batch')}
              placeholder="e.g. 2021-2025"
            />
            {errors.batch && <p className="mt-1 text-xs text-red-600">{errors.batch}</p>}
          </div>

          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <input
              id="date_of_birth"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => handleChange('date_of_birth', e.target.value)}
              className={fieldClass('date_of_birth')}
            />
          </div>

          <div className="sm:col-span-2">
            <PhotoUpload
              value={form.profile_photo_url || null}
              onChange={(url) => handleChange('profile_photo_url', url ?? '')}
              folder={form.student_id ? `students/${form.student_id}` : 'students'}
            />
          </div>
        </div>

        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
          <Link
            to={isEdit && studentId ? `/students/${studentId}` : '/students'}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Spinner className="h-4 w-4 text-white" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Student'}
          </button>
        </div>
      </form>
    </div>
  )
}