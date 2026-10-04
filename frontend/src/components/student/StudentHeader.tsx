import { Link } from 'react-router-dom'
import type { Student } from '../../types'
import { useAuth } from '../../contexts/AuthContext'

export function StudentHeader({ student }: { student: Student }) {
  const { profile } = useAuth()

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-600" />
      <div className="px-6 pb-6">
        <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            {student.profile_photo_url ? (
              <img
                src={student.profile_photo_url}
                alt={student.name}
                className="h-24 w-24 rounded-full border-4 border-white bg-white object-cover shadow-md"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-blue-100 text-3xl font-bold text-blue-700 shadow-md">
                {student.name.charAt(0)}
              </div>
            )}
            <div className="pb-1">
              <h1 className="text-xl font-bold text-gray-900">{student.name}</h1>
              <p className="text-sm text-gray-500">
                {student.student_id} · {student.department} · Batch {student.batch}
              </p>
            </div>
          </div>
          <div className="flex gap-2 pb-1">
            <Link
              to={`/students/${student.student_id}/analytics`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Analytics
            </Link>
            {profile?.role === 'ADMIN' && (
              <Link
                to={`/students/${student.student_id}/data`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Manage Data
              </Link>
            )}
            {profile?.role === 'ADMIN' && (
              <Link
                to={`/admin/students/${student.student_id}/edit`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Edit
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <HeaderInfo label="Student ID" value={student.student_id} />
          <HeaderInfo label="Department" value={student.department} />
          <HeaderInfo label="Batch" value={student.batch} />
          <HeaderInfo label="Email" value={student.email ?? '—'} />
          <HeaderInfo label="Phone" value={student.phone ?? '—'} />
          <HeaderInfo label="Date of Birth" value={student.date_of_birth ?? '—'} />
        </div>
      </div>
    </div>
  )
}

function HeaderInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-gray-900" title={value}>
        {value}
      </p>
    </div>
  )
}