import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStudents } from '../hooks/useStudents'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../contexts/AuthContext'

export default function StudentList() {
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [batchFilter, setBatchFilter] = useState('all')
  const { data: students, isLoading, error, refetch } = useStudents()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const departments = useMemo(
    () => [...new Set(students?.map((s) => s.department) ?? [])].sort(),
    [students],
  )
  const batches = useMemo(
    () => [...new Set(students?.map((s) => s.batch) ?? [])].sort().reverse(),
    [students],
  )

  const filtered = useMemo(() => {
    return (students ?? []).filter((s) => {
      const matchesSearch =
        search.trim() === '' ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.student_id.toLowerCase().includes(search.toLowerCase())
      const matchesDept =
        departmentFilter === 'all' || s.department === departmentFilter
      const matchesBatch = batchFilter === 'all' || s.batch === batchFilter
      return matchesSearch && matchesDept && matchesBatch
    })
  }, [students, search, departmentFilter, batchFilter])

  if (isLoading) return <LoadingState message="Loading students..." />
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filtered.length} student{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {profile?.role === 'ADMIN' && (
          <Link
            to="/admin/students/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Student
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 lg:col-span-2"
        />
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">All batches</option>
          {batches.map((b) => (
            <option key={b} value={b}>
              Batch {b}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No students match your search"
          message="Try adjusting the filters or search criteria."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Student ID
                </th>
                <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                  Department
                </th>
                <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">
                  Batch
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => navigate(`/students/${student.student_id}`)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                        {student.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{student.student_id}</td>
                  <td className="hidden px-6 py-4 text-sm text-gray-600 md:table-cell">
                    {student.department}
                  </td>
                  <td className="hidden px-6 py-4 sm:table-cell">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      {student.batch}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/students/${student.student_id}`)
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}