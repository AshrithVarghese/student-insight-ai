import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
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
} from '../hooks/useStudents'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { StudentHeader } from '../components/student/StudentHeader'
import { MetricCard } from '../components/analytics/MetricCard'
import { GpaChart, CgpaChart, AttendanceChart, SubjectPerformanceChart } from '../components/charts/Charts'
import {
  ActivityList,
  CertificationList,
  ConductRecordList,
  ProjectList,
  SkillsList,
  AchievementList,
} from '../components/profile/ProfileSections'
import { computeAnalytics } from '../hooks/useStudents'
import { useAuth } from '../contexts/AuthContext'

type TabId =
  | 'overview'
  | 'attendance'
  | 'subjects'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'achievements'
  | 'activities'
  | 'conduct'

export default function StudentProfile() {
  const { studentId } = useParams()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const { profile } = useAuth()

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

  const anyLoading =
    studentQuery.isLoading ||
    semestersQuery.isLoading ||
    resultsQuery.isLoading ||
    attendanceQuery.isLoading ||
    skillsQuery.isLoading ||
    projectsQuery.isLoading ||
    certificationsQuery.isLoading ||
    achievementsQuery.isLoading ||
    activitiesQuery.isLoading

  const anyError =
    studentQuery.error ||
    semestersQuery.error ||
    resultsQuery.error ||
    attendanceQuery.error ||
    skillsQuery.error ||
    projectsQuery.error ||
    certificationsQuery.error ||
    achievementsQuery.error ||
    activitiesQuery.error

  const chartData = useMemo(
    () =>
      (semestersQuery.data ?? []).map((s) => ({
        name: `Sem ${s.semester_number}`,
        gpa: s.sgpa,
        cgpa: s.cgpa,
      })),
    [semestersQuery.data],
  )

  if (anyLoading) return <LoadingState message="Loading student profile..." />
  if (anyError) return <ErrorState message={(anyError as Error).message} />
  if (!studentQuery.data) return <EmptyState title="Student not found" />

  const student = studentQuery.data
  const semesters = semestersQuery.data ?? []
  const results = resultsQuery.data ?? []
  const attendance = attendanceQuery.data ?? []
  const skills = skillsQuery.data ?? []
  const projects = projectsQuery.data ?? []
  const certifications = certificationsQuery.data ?? []
  const achievements = achievementsQuery.data ?? []
  const activities = activitiesQuery.data ?? []
  const conduct = conductQuery.data ?? []

  const analytics = computeAnalytics(semesters, attendance, results, projects, certifications, achievements)

  const attendanceData = attendance.map((a) => ({
    name: a.subject?.name ?? 'Subject',
    value: a.percentage,
  }))

  const subjectMap = new Map<string, number[]>()
  for (const r of results) {
    if (r.marks !== null) {
      const name = r.subject?.name ?? r.subject_id
      const arr = subjectMap.get(name) ?? []
      arr.push(r.marks)
      subjectMap.set(name, arr)
    }
  }
  const subjectData = [...subjectMap.entries()].map(([name, marks]) => ({
    name,
    value: Math.round(marks.reduce((a, b) => a + b, 0) / marks.length * 10) / 10,
  }))

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'subjects', label: 'Subjects' },
    { id: 'skills', label: 'Skills', count: skills.length },
    { id: 'projects', label: 'Projects', count: projects.length },
    { id: 'certifications', label: 'Certifications', count: certifications.length },
    { id: 'achievements', label: 'Achievements', count: achievements.length },
    { id: 'activities', label: 'Activities', count: activities.length },
  ]

  if (profile?.role === 'ADMIN' || profile?.role === 'FACULTY') {
    tabs.push({ id: 'conduct', label: 'Conduct', count: conduct.length })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <StudentHeader student={student} />

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'overview' && (
          <OverviewTab
            analytics={analytics}
            chartData={chartData}
            latestSemester={semesters[semesters.length - 1]}
          />
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <MetricGrid>
              <MetricCard
                label="Average Attendance"
                value={analytics.attendanceAverage !== null ? `${analytics.attendanceAverage.toFixed(1)}%` : '—'}
              />
              <MetricCard
                label="Attendance Records"
                value={attendance.length}
              />
            </MetricGrid>
            {attendanceData.length > 0 ? (
              <ChartCard title="Attendance by Subject">
                <AttendanceChart data={attendanceData} />
              </ChartCard>
            ) : (
              <EmptyState title="No attendance data" />
            )}
            {attendanceData.length > 0 && (
              <ChartCard title="Attendance Records">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Subject</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Classes Held</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Attended</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {attendance.map((a) => (
                        <tr key={a.id}>
                          <td className="px-4 py-2.5 font-medium text-gray-900">
                            {a.subject?.name ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{a.classes_held}</td>
                          <td className="px-4 py-2.5 text-gray-600">{a.classes_attended}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`font-medium ${
                                (a.percentage ?? 0) >= 75 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {a.percentage !== null ? `${a.percentage.toFixed(1)}%` : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            )}
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="space-y-6">
            <MetricGrid>
              <MetricCard
                label="Subject Average"
                value={analytics.subjectAverage !== null ? `${analytics.subjectAverage.toFixed(1)}%` : '—'}
              />
              <MetricCard
                label="Consistency"
                value={analytics.performanceConsistency}
              />
              <MetricCard
                label="Strong Subjects"
                value={analytics.strongSubjects.length}
              />
              <MetricCard
                label="Weak Subjects"
                value={analytics.weakSubjects.length}
              />
            </MetricGrid>
            {subjectData.length > 0 ? (
              <ChartCard title="Subject Performance">
                <SubjectPerformanceChart data={subjectData} />
              </ChartCard>
            ) : (
              <EmptyState title="No subject results" />
            )}
            {analytics.strongSubjects.length > 0 && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                  <h3 className="text-sm font-semibold text-green-800">Strong Subjects</h3>
                  <ul className="mt-3 space-y-1.5">
                    {analytics.strongSubjects.map((s) => (
                      <li key={s} className="flex items-center gap-2 text-sm text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                  <h3 className="text-sm font-semibold text-red-800">Needs Improvement</h3>
                  <ul className="mt-3 space-y-1.5">
                    {analytics.weakSubjects.length > 0 ? (
                      analytics.weakSubjects.map((s) => (
                        <li key={s} className="flex items-center gap-2 text-sm text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          {s}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-red-600">No weak subjects identified.</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'skills' && <SectionCard title="Skills"><SkillsList skills={skills} /></SectionCard>}
        {activeTab === 'projects' && <SectionCard title="Projects"><ProjectList projects={projects} /></SectionCard>}
        {activeTab === 'certifications' && (
          <SectionCard title="Certifications"><CertificationList certifications={certifications} /></SectionCard>
        )}
        {activeTab === 'achievements' && (
          <SectionCard title="Achievements"><AchievementList achievements={achievements} /></SectionCard>
        )}
        {activeTab === 'activities' && (
          <SectionCard title="Extracurricular Activities"><ActivityList activities={activities} /></SectionCard>
        )}
        {activeTab === 'conduct' && (
          <SectionCard title="Conduct Records"><ConductRecordList records={conduct} /></SectionCard>
        )}
      </div>
    </div>
  )
}

function OverviewTab({
  analytics,
  chartData,
  latestSemester,
}: {
  analytics: ReturnType<typeof computeAnalytics>
  chartData: { name: string; gpa: number | null; cgpa: number | null }[]
  latestSemester?: { semester_number: number } | null
}) {
  return (
    <div className="space-y-6">
      <MetricGrid>
        <MetricCard
          label="Current Semester"
          value={latestSemester ? `Sem ${latestSemester.semester_number}` : '—'}
        />
        <MetricCard
          label="Current SGPA"
          value={analytics.currentSgpa !== null ? analytics.currentSgpa.toFixed(2) : '—'}
          color="blue"
        />
        <MetricCard
          label="Current CGPA"
          value={analytics.currentCgpa !== null ? analytics.currentCgpa.toFixed(2) : '—'}
          color="green"
        />
        <MetricCard
          label="CGPA Change"
          value={
            analytics.cgpaChange !== null
              ? `${analytics.cgpaChange >= 0 ? '+' : ''}${analytics.cgpaChange.toFixed(2)}`
              : '—'
          }
          color={analytics.cgpaChange !== null && analytics.cgpaChange >= 0 ? 'green' : 'red'}
        />
        <MetricCard
          label="Attendance"
          value={analytics.attendanceAverage !== null ? `${analytics.attendanceAverage.toFixed(1)}%` : '—'}
          color="indigo"
        />
        <MetricCard
          label="Trend"
          value={analytics.trend === 'NO_DATA' ? '—' : analytics.trend.charAt(0) + analytics.trend.slice(1).toLowerCase()}
          color={analytics.trend === 'IMPROVING' ? 'green' : analytics.trend === 'DECLINING' ? 'red' : 'blue'}
        />
      </MetricGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {chartData.length > 0 && (
          <>
            <ChartCard title="CGPA Trend">
              <CgpaChart data={chartData} />
            </ChartCard>
            <ChartCard title="Semester GPA">
              <GpaChart data={chartData} />
            </ChartCard>
          </>
        )}
      </div>

      {analytics.trendReason && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Trend Analysis</h3>
          <p className="mt-1.5 text-sm text-gray-600">{analytics.trendReason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Projects" value={analytics.projectCount} />
        <MetricCard label="Certifications" value={analytics.certificationCount} />
        <MetricCard label="Achievements" value={analytics.achievementCount} />
      </div>
    </div>
  )
}

function MetricGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{children}</div>
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  )
}