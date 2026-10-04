import type { Skill, Project, Certification, Achievement, ExtracurricularActivity, ConductRecord } from '../../types'

const proficiencyColors: Record<Skill['proficiency'], string> = {
  Beginner: 'bg-gray-100 text-gray-700',
  Intermediate: 'bg-blue-50 text-blue-700',
  Advanced: 'bg-green-50 text-green-700',
  Expert: 'bg-purple-50 text-purple-700',
}

export function SkillsList({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) return <p className="text-sm text-gray-500">No skills listed.</p>

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span
          key={skill.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm"
        >
          <span className="font-medium text-gray-900">{skill.skill_name}</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${proficiencyColors[skill.proficiency]}`}
          >
            {skill.proficiency}
          </span>
        </span>
      ))}
    </div>
  )
}

export function ProjectList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return <p className="text-sm text-gray-500">No projects listed.</p>

  return (
    <ul className="space-y-4">
      {projects.map((project) => (
        <li key={project.id} className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{project.title}</h4>
              {project.role && <p className="mt-0.5 text-xs text-gray-500">Role: {project.role}</p>}
            </div>
            {project.date && <span className="shrink-0 text-xs text-gray-400">{project.date}</span>}
          </div>
          {project.description && (
            <p className="mt-2 text-sm text-gray-600">{project.description}</p>
          )}
          {project.technologies && project.technologies.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export function CertificationList({ certifications }: { certifications: Certification[] }) {
  if (certifications.length === 0) return <p className="text-sm text-gray-500">No certifications listed.</p>

  return (
    <ul className="space-y-3">
      {certifications.map((cert) => (
        <li key={cert.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{cert.name}</p>
            {cert.issuer && <p className="mt-0.5 text-xs text-gray-500">{cert.issuer}</p>}
            {cert.issue_date && <p className="mt-0.5 text-xs text-gray-400">Issued {cert.issue_date}</p>}
          </div>
          {cert.credential_url && (
            <a
              href={cert.credential_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}

export function AchievementList({ achievements }: { achievements: Achievement[] }) {
  if (achievements.length === 0) return <p className="text-sm text-gray-500">No achievements recorded.</p>

  return (
    <ul className="space-y-3">
      {achievements.map((achievement) => (
        <li key={achievement.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{achievement.title}</p>
            {achievement.description && (
              <p className="mt-1 text-sm text-gray-600">{achievement.description}</p>
            )}
            {achievement.date && <p className="mt-1 text-xs text-gray-400">{achievement.date}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function ActivityList({ activities }: { activities: ExtracurricularActivity[] }) {
  if (activities.length === 0) return <p className="text-sm text-gray-500">No extracurricular activities listed.</p>

  return (
    <ul className="space-y-3">
      {activities.map((activity) => (
        <li key={activity.id} className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{activity.activity}</h4>
              {activity.role && <p className="mt-0.5 text-xs text-gray-500">Role: {activity.role}</p>}
            </div>
            {activity.date && <span className="shrink-0 text-xs text-gray-400">{activity.date}</span>}
          </div>
          {activity.description && (
            <p className="mt-2 text-sm text-gray-600">{activity.description}</p>
          )}
        </li>
      ))}
    </ul>
  )
}

export function ConductRecordList({ records }: { records: ConductRecord[] }) {
  if (records.length === 0) return <p className="text-sm text-gray-500">No conduct records on file.</p>

  const statusColors: Record<string, string> = {
    APPROVED: 'bg-green-50 text-green-700',
    PENDING: 'bg-yellow-50 text-yellow-700',
    RESOLVED: 'bg-blue-50 text-blue-700',
    CLOSED: 'bg-gray-100 text-gray-600',
  }

  return (
    <ul className="space-y-3">
      {records.map((record) => (
        <li key={record.id} className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{record.type}</h4>
              {record.description && (
                <p className="mt-1 text-sm text-gray-600">{record.description}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {record.status && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusColors[record.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {record.status}
                </span>
              )}
              {record.date && <span className="text-xs text-gray-400">{record.date}</span>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}