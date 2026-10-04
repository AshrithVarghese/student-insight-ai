import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useStudents } from '../hooks/useStudents'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'

export default function Dashboard() {
  const { profile } = useAuth()
  const { data: students, isLoading, error, refetch } = useStudents()

  if (isLoading) return <LoadingState message="Loading students..." />
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />

  const departments = [...new Set(students?.map((s) => s.department) ?? [])]
  const batches = [...new Set(students?.map((s) => s.batch) ?? [])]
  const currentSemesterCount = students?.length ?? 0

  const recentStudents = students?.slice(-5).reverse() ?? []

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {profile?.name?.split(' ')[0] ?? 'Admin'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of registered students and academic insights.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/students"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            View all students
          </Link>
          <Link
            to="/face-recognition"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Face Recognition
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Students"
          value={currentSemesterCount.toString()}
          icon={<UsersIcon className="h-5 w-5" />}
        />
        <MetricCard
          label="Departments"
          value={departments.length.toString()}
          icon={<BuildingIcon className="h-5 w-5" />}
        />
        <MetricCard
          label="Batches"
          value={batches.length.toString()}
          icon={<CalendarIcon className="h-5 w-5" />}
        />
        <MetricCard
          label="Average CGPA"
          value={students && students.length > 0 ? '—' : '0.00'}
          icon={<ChartIcon className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Recent Students</h2>
              <Link to="/students" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>

            {recentStudents.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No students registered yet"
                  message="Add your first student to get started."
                />
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentStudents.map((student) => (
                  <li key={student.id}>
                    <Link
                      to={`/students/${student.student_id}`}
                      className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                        {student.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{student.name}</p>
                        <p className="truncate text-xs text-gray-500">
                          {student.student_id} · {student.department}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        Batch {student.batch}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
            <div className="mt-4 space-y-3">
              <Link
                to="/face-recognition"
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <FaceIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Identify via Camera</p>
                  <p className="text-xs text-gray-500">Use face recognition to find a student</p>
                </div>
              </Link>

              {profile?.role === 'ADMIN' && (
                <Link
                  to="/admin/students/new"
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-white">
                    <PlusIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Register New Student</p>
                    <p className="text-xs text-gray-500">Add a student to the system</p>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {students && students.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">Top Departments</h2>
              <div className="mt-4 space-y-3">
                {departments.slice(0, 5).map((dept) => {
                  const count = students.filter((s) => s.department === dept).length
                  const max = Math.max(
                    ...departments.map(
                      (d) => students.filter((s) => s.department === d).length,
                    ),
                  )
                  return (
                    <div key={dept}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{dept}</span>
                        <span className="text-gray-500">{count}</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
      />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  )
}

function FaceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}