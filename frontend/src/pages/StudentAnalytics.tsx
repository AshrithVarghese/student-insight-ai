import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  useAttendance,
  useCertifications,
  useProjects,
  useResults,
  useSemesters,
  useSkills,
  useStudent,
  computeAnalytics,
} from '../hooks/useStudents'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { MetricCard } from '../components/analytics/MetricCard'
import { getCareerRecommendations, getPerformanceSummary, predictCgpa } from '../lib/mlClient'
import type { CareerRecommendation } from '../types'

type MetricColor = 'blue' | 'green' | 'amber' | 'red' | 'indigo'

interface MetricItem {
  label: string
  value: string
  color?: MetricColor
}

export default function StudentAnalytics() {
  const { studentId } = useParams()

  const studentQuery = useStudent(studentId ?? '')
  const uuid = studentQuery.data?.id
  const semestersQuery = useSemesters(uuid)
  const resultsQuery = useResults(uuid)
  const attendanceQuery = useAttendance(uuid)
  const skillsQuery = useSkills(uuid)
  const projectsQuery = useProjects(uuid)
  const certificationsQuery = useCertifications(uuid)

  const anyLoading =
    studentQuery.isLoading ||
    semestersQuery.isLoading ||
    resultsQuery.isLoading ||
    attendanceQuery.isLoading ||
    skillsQuery.isLoading ||
    projectsQuery.isLoading ||
    certificationsQuery.isLoading

  const anyError =
    studentQuery.error ||
    semestersQuery.error ||
    resultsQuery.error ||
    attendanceQuery.error ||
    skillsQuery.error ||
    projectsQuery.error ||
    certificationsQuery.error

  const analytics = useMemo(
    () =>
      computeAnalytics(
        semestersQuery.data ?? [],
        attendanceQuery.data ?? [],
        resultsQuery.data ?? [],
        projectsQuery.data ?? [],
        certificationsQuery.data ?? [],
        [],
      ),
    [
      semestersQuery.data,
      attendanceQuery.data,
      resultsQuery.data,
      projectsQuery.data,
      certificationsQuery.data,
    ],
  )

  const hasEnoughDataForPrediction =
    (semestersQuery.data?.length ?? 0) >= 3 &&
    analytics.attendanceAverage !== null

  const predictionPayload = useMemo(() => {
    const semesters = (semestersQuery.data ?? []).sort(
      (a, b) => a.semester_number - b.semester_number,
    )
    const latest = semesters.at(-1)
    return {
      previousCgpa: latest?.cgpa ?? 0,
      attendance: analytics.attendanceAverage ?? 0,
      internalScore: analytics.subjectAverage ?? 0,
      projectScore: analytics.projectCount > 0 ? 80 : 0,
    }
  }, [semestersQuery.data, analytics])

  const predictionQuery = useQuery({
    queryKey: ['prediction', studentId],
    queryFn: () => predictCgpa(predictionPayload),
    enabled: hasEnoughDataForPrediction,
  })

  const careerQuery = useQuery({
    queryKey: ['career', studentId],
    queryFn: () =>
      getCareerRecommendations({
        skills: (skillsQuery.data ?? []).map((s) => ({ name: s.skill_name, proficiency: s.proficiency })),
        projects: (projectsQuery.data ?? []).map((p) => ({
          technologies: p.technologies ?? [],
          title: p.title,
        })),
        certifications: (certificationsQuery.data ?? []).map((c) => ({ name: c.name, issuer: c.issuer })),
        cgpa: analytics.currentCgpa,
      }),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  })

  const summaryData = useMemo(
    () => ({
      cgpaTrend: analytics.trend as string,
      attendance: analytics.attendanceAverage,
      strongSubjects: analytics.strongSubjects,
      weakSubjects: analytics.weakSubjects,
      projectCount: analytics.projectCount,
      certificationCount: analytics.certificationCount,
    }),
    [analytics],
  )

  const summaryQuery = useQuery({
    queryKey: ['summary', studentId],
    queryFn: () => getPerformanceSummary(summaryData),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  })

  const overviewMetrics: MetricItem[] = []
  if (analytics.currentCgpa !== null) {
    overviewMetrics.push({ label: 'Current CGPA', value: analytics.currentCgpa.toFixed(2) })
  }
  if (analytics.cgpaChange !== null) {
    overviewMetrics.push({
      label: 'CGPA Change',
      value: `${analytics.cgpaChange >= 0 ? '+' : ''}${analytics.cgpaChange.toFixed(2)}`,
      color: analytics.cgpaChange >= 0 ? 'green' : 'red',
    })
  }
  if (analytics.attendanceAverage !== null) {
    overviewMetrics.push({ label: 'Avg Attendance', value: `${analytics.attendanceAverage.toFixed(1)}%` })
  }
  if (analytics.subjectAverage !== null) {
    overviewMetrics.push({ label: 'Subject Avg', value: `${analytics.subjectAverage.toFixed(1)}%` })
  }

  const hasOverview = overviewMetrics.length > 0
  const hasTrend = analytics.trend !== 'NO_DATA'
  const hasTrendDetails =
    analytics.strongSubjects.length > 0 ||
    analytics.weakSubjects.length > 0 ||
    analytics.performanceConsistency !== 'N/A'
  const hasPrediction =
    predictionQuery.data?.status === 'AVAILABLE' && predictionQuery.data?.predictedCgpa != null
  const hasCareer = (careerQuery.data?.length ?? 0) > 0
  const hasSummary = Boolean(summaryQuery.data?.summary?.trim())
  const hasAnySection = hasOverview || hasTrend || hasPrediction || hasCareer || hasSummary

  if (anyLoading) return <LoadingState message="Computing analytics..." />
  if (anyError) return <ErrorState message={(anyError as Error).message} />
  if (!studentQuery.data) {
    return <LoadingState message="Student not found" />
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{studentQuery.data.name} — Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Academic trends, predictions, and career insights.
          </p>
        </div>
        <Link
          to={`/students/${studentQuery.data.student_id}`}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Back to Profile
        </Link>
      </div>

      {!hasAnySection ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">No analytics data yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            Add grades, attendance, projects, and other data for this student to unlock analytics.
          </p>
        </div>
      ) : (
        <>
          {hasOverview && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">Academic Overview</h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  VERIFIED DATA
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {overviewMetrics.map((metric) => (
                  <MetricCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    color={metric.color ?? 'blue'}
                  />
                ))}
              </div>
            </div>
          )}

          <div className={`grid grid-cols-1 gap-6 ${hasTrend && hasPrediction ? 'lg:grid-cols-2' : ''}`}>
            {hasTrend && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900">Academic Trend</h2>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    ANALYTICS
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <TrendBadge trend={analytics.trend} />
                </div>

                {analytics.trendReason && (
                  <p className="mt-4 text-sm text-gray-600">{analytics.trendReason}</p>
                )}

                {hasTrendDetails && (
                  <div className="mt-6 space-y-3">
                    {analytics.strongSubjects.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Strong Subjects</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {analytics.strongSubjects.map((s) => (
                            <span key={s} className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {analytics.weakSubjects.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Needs Improvement</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {analytics.weakSubjects.map((s) => (
                            <span key={s} className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {analytics.performanceConsistency !== 'N/A' && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Consistency</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">{analytics.performanceConsistency}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {(hasPrediction || predictionQuery.isLoading) && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900">Predicted Future CGPA</h2>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    PREDICTION
                  </span>
                </div>

                {predictionQuery.data?.status === 'AVAILABLE' && predictionQuery.data.predictedCgpa != null ? (
                  <div>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        {predictionQuery.data.predictedCgpa.toFixed(2)}
                      </span>
                      <div className="mb-1.5">
                        <p className="text-xs text-gray-500">model {predictionQuery.data.modelVersion}</p>
                        <p className="text-xs text-fuchsia-600">Estimate — not guaranteed</p>
                      </div>
                    </div>
                    {analytics.currentCgpa !== null && (
                      <p className="mt-2 text-sm text-gray-500">
                        Projected change:{' '}
                        <span
                          className={
                            predictionQuery.data.predictedCgpa >= analytics.currentCgpa
                              ? 'font-medium text-green-600'
                              : 'font-medium text-red-600'
                          }
                        >
                          {predictionQuery.data.predictedCgpa >= analytics.currentCgpa ? '+' : ''}
                          {(predictionQuery.data.predictedCgpa - analytics.currentCgpa).toFixed(2)}
                        </span>
                      </p>
                    )}
                    <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4">
                      <p className="text-xs font-medium text-gray-400">Based on:</p>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>• Previous CGPA history</li>
                        <li>• Average attendance</li>
                        <li>• Internal assessment marks</li>
                        <li>• Project performance</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <LoadingState message="Running prediction..." />
                )}
              </div>
            )}
          </div>

          {(hasCareer || careerQuery.isLoading || careerQuery.isError) && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">Career Recommendations</h2>
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                  RECOMMENDATION
                </span>
              </div>

              {careerQuery.isLoading ? (
                <LoadingState message="Analyzing profile..." />
              ) : careerQuery.isError ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p>
                    Recommendations could not be loaded. The ML service may be unavailable.
                  </p>
                  <button
                    onClick={() => careerQuery.refetch()}
                    className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {careerQuery.data?.map((rec, index) => (
                      <CareerCard key={rec.role} rec={rec} index={index} />
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-gray-400">
                    Scores indicate profile compatibility, not probability of career success.
                  </p>
                </>
              )}
            </div>
          )}

          {(hasSummary || summaryQuery.isLoading || summaryQuery.isError) && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">Performance Summary</h2>
                <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
                  AI-ASSISTED
                </span>
              </div>

              {summaryQuery.isLoading ? (
                <LoadingState message="Generating summary..." />
              ) : summaryQuery.isError ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p>The summary could not be generated at this time.</p>
                  <button
                    onClick={() => summaryQuery.refetch()}
                    className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm leading-relaxed text-gray-700">{summaryQuery.data?.summary}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TrendBadge({ trend }: { trend: string }) {
  const styles: Record<string, string> = {
    IMPROVING: 'border-green-200 bg-green-50 text-green-700',
    STABLE: 'border-blue-200 bg-blue-50 text-blue-700',
    DECLINING: 'border-red-200 bg-red-50 text-red-700',
    NO_DATA: 'border-gray-200 bg-gray-50 text-gray-600',
  }

  const icons: Record<string, React.ReactNode> = {
    IMPROVING: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    STABLE: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15" />
      </svg>
    ),
    DECLINING: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
      </svg>
    ),
    NO_DATA: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15" />
      </svg>
    ),
  }

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${styles[trend] ?? styles.NO_DATA}`}>
      {icons[trend]}
      {trend === 'NO_DATA' ? 'No trend data' : trend.charAt(0) + trend.slice(1).toLowerCase()}
    </span>
  )
}

function CareerCard({ rec, index }: { rec: CareerRecommendation; index: number }) {
  return (
    <div className="rounded-xl border border-gray-200 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-sm font-bold text-purple-700">
            {index + 1}
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{rec.role}</h3>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">{rec.score}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">score</p>
        </div>
      </div>
      {rec.matchedFactors.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <ul className="space-y-1">
            {rec.matchedFactors.slice(0, 4).map((factor) => (
              <li key={factor} className="flex items-start gap-1.5 text-xs text-gray-600">
                <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-purple-400" />
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}