// Parser for JEC/KTU style academic transcripts.

export interface ParsedSubjectResult {
  code: string
  subjectName: string
  grade: string | null
  credits: number | null
  monthYear: string | null
  semesterNumber: number
}

export interface ParsedSemester {
  semesterNumber: number
  sgpa: number | null
  cgpa: number | null
  academicYear: string | null
  results: ParsedSubjectResult[]
}

export interface ParsedTranscript {
  registerNumber: string | null
  semesters: ParsedSemester[]
}

export const GRADE_OPTIONS = ['S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E', 'F', 'PASS'] as const

// Grade point mapping mirrors the seeded database convention: 'S' (grade point
// 10) and computed 'PASS' courses are stored as grade text only, because the
// live DB column grade_point is DECIMAL(3,2) (max 9.99). The official SGPA/CGPA
// are stored on the semester row.
export const GRADE_POINTS: Record<string, number | null> = {
  'S': null,
  'A+': 9,
  'A': 8,
  'B+': 7,
  'B': 6,
  'C+': 5,
  'C': 4,
  'D': 3,
  'E': 2,
  'F': null,
  'PASS': null,
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
}

const CODE_RE = /\b([A-Z]{2,10})\s*([0-9]{3})\b/

const GRADE_LOOKUP: Record<string, string> = {
  'S': 'S',
  'A+': 'A+',
  'APLUS': 'A+',
  'A': 'A',
  'B+': 'B+',
  'BPLUS': 'B+',
  'B': 'B',
  'C+': 'C+',
  'CPLUS': 'C+',
  'C': 'C',
  'D': 'D',
  'E': 'E',
  'F': 'F',
  'PASS': 'PASS',
  'PAS': 'PASS',
}

function normalizeGrade(token: string): string | null {
  let t = token.toUpperCase().replace(/[^A-Z+0-9]/g, '')
  if (/^[ABC]\d+$/.test(t)) t = `${t[0]}+`
  t = t.replace(/[^A-Z+]/g, '')
  return GRADE_LOOKUP[t] ?? null
}

function normWord(token: string): string {
  return token.replace(/[^A-Za-z]/g, '').toLowerCase()
}

function findGrade(tokens: string[], start: number): { grade: string | null; index: number } {
  for (let i = start; i < tokens.length; i++) {
    const grade = normalizeGrade(tokens[i])
    if (grade) return { grade, index: i }
  }
  return { grade: null, index: -1 }
}

function findCredits(tokens: string[], start: number): number | null {
  for (let i = start; i < tokens.length; i++) {
    const t = tokens[i].replace(/[^0-9.]/g, '')
    if (/^\d{4}$/.test(t)) continue
    if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t)
  }
  return null
}

function findMonthYear(tokens: string[], start: number): string | null {
  for (let i = start; i < tokens.length; i++) {
    const month = MONTHS[normWord(tokens[i])]
    if (month) {
      const year = tokens[i + 1] && /^\d{4}$/.test(tokens[i + 1]) ? ` ${tokens[i + 1]}` : ''
      return `${tokens[i]}${year}`
    }
  }
  return null
}

function monthNumber(monthYear: string): number | null {
  const m = monthYear.toLowerCase().match(/[a-z]+/)
  return m ? (MONTHS[m[0]] ?? null) : null
}

function yearNumber(monthYear: string): number | null {
  const m = monthYear.match(/\b(\d{4})\b/)
  return m ? parseInt(m[1], 10) : null
}

function academicYearForMonthYear(monthYear: string): string | null {
  const year = yearNumber(monthYear)
  const month = monthNumber(monthYear)
  if (year == null || month == null) return null
  // Academic year runs ~June/July -> May/June. Exams Jul-Dec belong to year,
  // Jan-May belong to year-1.
  const startYear = month >= 7 ? year : year - 1
  return `${startYear}-${startYear + 1}`
}

function isHeaderLine(lower: string): boolean {
  // Skip transcript chrome: page headers, branch/college lines, totals and
  // table headers. Merged OCR lines (e.g. "BranchCOMPUTER...") are caught with
  // substring checks.
  if (/name of college|branch|examination|credits? earned/.test(lower)) return true
  return (
    lower.startsWith('course name') ||
    lower.startsWith('total') ||
    lower.startsWith('grade') ||
    lower.startsWith('month') ||
    lower.startsWith('year of')
  )
}

export function parseTranscript(raw: string): ParsedTranscript {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  let registerNumber: string | null = null
  let lastSemester = 0
  const semesterSgpa = new Map<number, number>()
  const semesterCgpa = new Map<number, number>()
  const pendingName: string[] = []
  const rows: ParsedSubjectResult[] = []

  for (const line of lines) {
    const lower = line.toLowerCase()

    const reg = lower.match(/register\s*number\s*([a-z0-9]+)/)
    if (reg) {
      registerNumber = reg[1].toUpperCase()
      continue
    }

    if (isHeaderLine(lower)) continue

    const sem = lower.match(/semester\s*s?\s*(\d+)/)
    if (sem) {
      lastSemester = parseInt(sem[1], 10)
      continue
    }

    const sg = lower.match(/sgpa[^\d]*(\d+(?:\.\d+)?)/)
    if (sg) {
      semesterSgpa.set(lastSemester, parseFloat(sg[1]))
      continue
    }

    const cg = lower.match(/cgpa[^\d]*(\d+(?:\.\d+)?)/)
    if (cg) {
      semesterCgpa.set(lastSemester, parseFloat(cg[1]))
      continue
    }

    const tokens = line.split(' ')

    let codeText: string | null = null
    let codeToken = -1
    for (let i = 0; i < tokens.length; i++) {
      const m = CODE_RE.exec(tokens[i])
      if (m) {
        codeText = `${m[1]}${m[2]}`.replace(/\s+/g, '')
        codeToken = i
        break
      }
    }

    if (codeText) {
      const nameFromLine = tokens.slice(0, codeToken).join(' ')
      const subjectName = [...pendingName, nameFromLine].filter(Boolean).join(' ')
      pendingName.length = 0

      const remainder = tokens.slice(codeToken + 1)
      const { grade, index: gradeIndex } = findGrade(remainder, 0)
      const tailStart = gradeIndex >= 0 ? gradeIndex + 1 : 0
      const credits = findCredits(remainder, tailStart)
      const monthYear = findMonthYear(remainder, tailStart)

      rows.push({
        semesterNumber: lastSemester,
        code: codeText,
        subjectName,
        grade,
        credits,
        monthYear,
      })
      continue
    }

    // Non-code line. First check if it completes the previous row (when the
    // transcript columns spilled onto a second line), then treat as a name
    // fragment of a wrapped subject name.
    const restGrade = findGrade(tokens, 0).grade
    const restCredits = findCredits(tokens, 0)
    if (restGrade && rows.length > 0) {
      const lastRow = rows[rows.length - 1]
      if (!lastRow.grade) lastRow.grade = restGrade
      if (!lastRow.credits) lastRow.credits = restCredits
      if (!lastRow.monthYear) lastRow.monthYear = findMonthYear(tokens, 0)
      continue
    }

    if (/^computer\s*science/i.test(lower)) continue

    // A lone month-year line (OCR column spillover) completes the previous row.
    if (
      rows.length > 0 &&
      /^(january|february|march|april|may|june|july|august|september|october|november|december)(\s*\d{4})?$/.test(
        lower,
      )
    ) {
      if (!rows[rows.length - 1].monthYear) rows[rows.length - 1].monthYear = line
      continue
    }

    pendingName.push(line)
  }

  // Normalize semester numbers: rows captured before any "Semester" header
  // fall back to semester 1.
  rows.forEach((r) => {
    r.semesterNumber = r.semesterNumber || 1
  })

  const yearCandidates = rows
    .map((r) => r.monthYear)
    .filter((m): m is string => Boolean(m))
    .map((m) => yearNumber(m))
    .filter((y): y is number => y !== null)
  const baseYear = yearCandidates.length > 0 ? Math.min(...yearCandidates) : null

  const numbers = [...new Set(rows.map((r) => r.semesterNumber))].sort((a, b) => a - b)

  const semesters: ParsedSemester[] = numbers.map((n) => {
    const results = rows.filter((r) => r.semesterNumber === n)
    const firstMonthYear = results.find((r) => r.monthYear)?.monthYear ?? null
    let academicYear = firstMonthYear ? academicYearForMonthYear(firstMonthYear) : null
    if (!academicYear && baseYear != null) {
      const startYear = baseYear + Math.floor((n - 1) / 2)
      academicYear = `${startYear}-${startYear + 1}`
    }
    return {
      semesterNumber: n,
      sgpa: semesterSgpa.get(n) ?? null,
      cgpa: semesterCgpa.get(n) ?? null,
      academicYear,
      results,
    }
  })

  return { registerNumber, semesters }
}