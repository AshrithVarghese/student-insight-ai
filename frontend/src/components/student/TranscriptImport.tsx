import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { extractTextFromImage, setOcrProgressListener } from '../../lib/ocr'
import { parseTranscript, GRADE_POINTS, GRADE_OPTIONS } from '../../lib/transcriptParser'
import { Spinner } from '../ui/LoadingState'
import type { ParsedTranscript } from '../../lib/transcriptParser'

interface ImportResultRow {
  key: string
  code: string
  name: string
  grade: string
  credits: string
  marks: string
}

interface ImportSemester {
  key: string
  number: number
  sgpa: string
  cgpa: string
  academicYear: string
  rows: ImportResultRow[]
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'

function toFloat(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isNaN(n) ? null : n
}

interface TranscriptImportProps {
  studentId: string
  studentName: string
  studentUuid: string
}

export default function TranscriptImport({ studentId, studentName, studentUuid }: TranscriptImportProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<'idle' | 'reading' | 'ready' | 'saving'>('idle')
  const [pasteMode, setPasteMode] = useState(false)
  const [rawText, setRawText] = useState('')
  const [progress, setProgress] = useState(0)
  const [processingFile, setProcessingFile] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [semesters, setSemesters] = useState<ImportSemester[]>([])
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    setOcrProgressListener((p) => setProgress(p.progress))
    return () => setOcrProgressListener(null)
  }, [])

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
      reader.readAsDataURL(file)
    })
  }

  function toState(parsed: ParsedTranscript): ImportSemester[] {
    return parsed.semesters.map((s, si) => ({
      key: `sem-${si}-${s.semesterNumber}`,
      number: s.semesterNumber,
      sgpa: s.sgpa == null ? '' : String(s.sgpa),
      cgpa: s.cgpa == null ? '' : String(s.cgpa),
      academicYear: s.academicYear ?? '',
      rows: s.results.map((r, ri) => ({
        key: `row-${si}-${ri}`,
        code: r.code,
        name: r.subjectName,
        grade: r.grade ?? '',
        credits: r.credits == null ? '' : String(r.credits),
        marks: '',
      })),
    }))
  }

  function applyText(text: string) {
    const parsed = parseTranscript(text)
    if (parsed.semesters.length === 0) {
      setSemesters([])
      setPhase('idle')
      setError('No subjects detected. Try a clearer image, or use paste mode and check the text.')
      return
    }
    const totalRows = parsed.semesters.reduce((n, s) => n + s.results.length, 0)
    setSemesters(toState(parsed))
    setPhase('ready')
    setMessage(
      `Parsed ${parsed.semesters.length} semester(s) with ${totalRows} subject(s). Review below, then import.` +
        (parsed.registerNumber && parsed.registerNumber !== studentId
          ? ` Found register number ${parsed.registerNumber} (expected ${studentId}).`
          : ''),
    )
  }

  async function handleFiles(files: FileList | null) {
    const fileList = Array.from(files ?? [])
    if (fileList.length === 0) return
    setError(null)
    setMessage(null)
    setProgress(0)
    setPhase('reading')
    try {
      const texts: string[] = []
      for (const file of fileList) {
        setProcessingFile(file.name)
        const dataUrl = await readFileAsDataUrl(file)
        const text = await extractTextFromImage(dataUrl)
        if (text.trim()) texts.push(text)
      }
      setProcessingFile('')
      const text = texts.join('\n')
      setRawText(text)
      applyText(text)
    } catch (err) {
      setPhase('idle')
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handlePasteParse() {
    setError(null)
    setMessage(null)
    if (!rawText.trim()) {
      setError('Paste the transcript text first.')
      return
    }
    applyText(rawText)
  }

  function updateSemester(key: string, patch: Partial<ImportSemester>) {
    setSemesters((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  }

  function updateRow(semKey: string, rowKey: string, patch: Partial<ImportResultRow>) {
    setSemesters((prev) =>
      prev.map((s) =>
        s.key === semKey
          ? { ...s, rows: s.rows.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)) }
          : s,
      ),
    )
  }

  function addRow(semKey: string) {
    setSemesters((prev) =>
      prev.map((s) =>
        s.key === semKey
          ? {
              ...s,
              rows: [
                ...s.rows,
                { key: `row-${Date.now()}`, code: '', name: '', grade: '', credits: '', marks: '' },
              ],
            }
          : s,
      ),
    )
  }

  function removeRow(semKey: string, rowKey: string) {
    setSemesters((prev) =>
      prev.map((s) => (s.key === semKey ? { ...s, rows: s.rows.filter((r) => r.key !== rowKey) } : s)),
    )
  }

  function removeSemester(semKey: string) {
    setSemesters((prev) => prev.filter((s) => s.key !== semKey))
  }

  function resetAll() {
    setSemesters([])
    setRawText('')
    setError(null)
    setMessage(null)
    setProgress(0)
    setShowRaw(false)
    setPhase('idle')
  }

  async function handleSave() {
    if (!studentUuid) return
    setError(null)
    setMessage(null)
    setPhase('saving')
    try {
      const allRows = semesters.flatMap((s) => s.rows)
      if (allRows.length === 0) throw new Error('Nothing to import.')

      // Sanity checks
      for (const s of semesters) {
        const number = Math.trunc(Number(s.number))
        if (Number.isNaN(number) || number < 1) {
          throw new Error('Every semester needs a semester number (1, 2, 3...).')
        }
        if (!s.academicYear.trim()) {
          throw new Error(`Semester ${s.number} is missing an academic year (e.g. 2024-2025).`)
        }
        for (const r of s.rows) {
          if (!r.code.trim()) throw new Error(`Semester ${s.number} has a subject without a code.`)
        }
      }

      // Subjects catalog
      const { data: subjectsResult, error: subjectsError } = await supabase
        .from('subjects')
        .select('code,id')
      if (subjectsError) throw new Error(subjectsError.message)
      const subjectByCode = new Map<string, string>()
      ;(subjectsResult ?? []).forEach((s) => subjectByCode.set(s.code.toUpperCase(), s.id))

      const missingSubjects: { code: string; name: string; credits: number; department: string }[] = []
      for (const r of allRows) {
        const code = r.code.trim().toUpperCase()
        if (!subjectByCode.has(code) && !missingSubjects.some((m) => m.code === code)) {
          missingSubjects.push({
            code,
            name: r.name.trim() || code,
            credits: Math.trunc(Number(r.credits)) || 0,
            department: 'Computer Science',
          })
        }
      }
      if (missingSubjects.length > 0) {
        const noCredits = missingSubjects.filter((m) => m.credits < 1)
        if (noCredits.length > 0) {
          throw new Error(
            `Missing credits for new subject(s): ${noCredits
              .map((m) => `${m.code}${m.name && m.name !== m.code ? ` (${m.name})` : ''}`)
              .join(', ')}. Fill in the credit count before importing.`,
          )
        }
        const { data: insertedSubjects, error: insertSubjectsError } = await supabase
          .from('subjects')
          .insert(missingSubjects)
          .select('code,id')
        if (insertSubjectsError) throw new Error(insertSubjectsError.message)
        ;(insertedSubjects ?? []).forEach((s) => subjectByCode.set(s.code.toUpperCase(), s.id))
      }

      // Existing semesters + results for upserts
      const { data: existingSemesters, error: semError } = await supabase
        .from('semesters')
        .select('id,semester_number')
        .eq('student_id', studentUuid)
      if (semError) throw new Error(semError.message)
      const semesterIdByNumber = new Map<number, string>()
      ;(existingSemesters ?? []).forEach((s) => semesterIdByNumber.set(s.semester_number, s.id))

      const { data: existingResults, error: resError } = await supabase
        .from('subject_results')
        .select('id,semester_id,subject_id')
      if (resError) throw new Error(resError.message)
      const resultIdByKey = new Map<string, string>()
      ;(existingResults ?? []).forEach((r) => resultIdByKey.set(`${r.semester_id}|${r.subject_id}`, r.id))

      let createdSemesters = 0
      let createdResults = 0
      let updatedResults = 0

      for (const s of semesters) {
        const number = Math.trunc(Number(s.number))
        let semesterId: string | null = semesterIdByNumber.get(number) ?? null
        if (semesterId) {
          const { error } = await supabase
            .from('semesters')
            .update({ sgpa: toFloat(s.sgpa), cgpa: toFloat(s.cgpa), academic_year: s.academicYear.trim() })
            .eq('id', semesterId)
          if (error) throw new Error(error.message)
        } else {
          const { data, error } = await supabase
            .from('semesters')
            .insert({
              student_id: studentUuid,
              semester_number: number,
              sgpa: toFloat(s.sgpa),
              cgpa: toFloat(s.cgpa),
              academic_year: s.academicYear.trim(),
            })
            .select('id')
          if (error) throw new Error(error.message)
          const insertedSemesterId = data[0].id as string
          semesterId = insertedSemesterId
          semesterIdByNumber.set(number, insertedSemesterId)
          createdSemesters += 1
        }

        for (const r of s.rows) {
          const code = r.code.trim().toUpperCase()
          const subjectId = subjectByCode.get(code)
          if (!subjectId) throw new Error(`Subject not found for code ${code}.`)
          const marksRaw = r.marks.trim()
          const marks = marksRaw === '' ? null : Number(marksRaw)
          if (marks !== null && (Number.isNaN(marks) || marks < 0 || marks > 100)) {
            throw new Error(`Invalid marks for ${code}.`)
          }
          const grade = r.grade.trim() || null
          const payload = {
            student_id: studentUuid,
            semester_id: semesterId,
            subject_id: subjectId,
            marks,
            grade,
            grade_point: grade ? GRADE_POINTS[grade.toUpperCase()] ?? null : null,
          }
          const existingId = resultIdByKey.get(`${semesterId}|${subjectId}`)
          if (existingId) {
            const { error } = await supabase.from('subject_results').update(payload).eq('id', existingId)
            if (error) throw new Error(error.message)
            updatedResults += 1
          } else {
            const { error } = await supabase.from('subject_results').insert(payload)
            if (error) throw new Error(error.message)
            createdResults += 1
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['semesters'] })
      await queryClient.invalidateQueries({ queryKey: ['results'] })
      await queryClient.invalidateQueries({ queryKey: ['subjects'] })

      setMessage(
        `Imported ${createdSemesters} semester(s) and ${createdResults} result(s)` +
          (updatedResults > 0 ? ` (${updatedResults} updated)` : '') +
          '.',
      )
      setPhase('ready')
    } catch (err) {
      setPhase('ready')
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const totalRows = semesters.reduce((n, s) => n + s.rows.length, 0)
  const saving = phase === 'saving'

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Import from Transcript Image</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Upload a photo/PDF-image of a results card for {studentName}.
        </p>
      </div>

      {phase === 'idle' || phase === 'reading' ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={phase === 'reading'}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phase === 'reading' && <Spinner className="h-4 w-4 text-white" />}
            {phase === 'reading' ? (processingFile ? `Reading ${processingFile}` : 'Reading...') : 'Upload transcript image(s)'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <span className="text-sm text-gray-400">or</span>
          <button
            type="button"
            onClick={() => {
              setPasteMode((m) => !m)
              setPhase('idle')
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Paste transcript text
          </button>
        </div>
      ) : null}

      {phase === 'reading' && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>{processingFile ? `Reading ${processingFile}...` : 'Initializing OCR (first run downloads ~12MB)...'}</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {pasteMode && (
        <div className="mt-4">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={10}
            placeholder={
              'Paste the transcript text here (one course per line), e.g.:\n\nALGORITHMIC THINKING WITH PYTHON  UCEST105  A+  4.0  December 2024\nBASIC ELECTRICAL AND ELECTRONICS ENGINEERING WORKSHOP  GXESL106  S  1.0  December 2024\nTotal Earned Credits  20\nSGPA  9.05\nCGPA  9.05'
            }
            className={`${inputClass} font-mono`}
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handlePasteParse}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Parse text
            </button>
          </div>
        </div>
      )}

      {error && phase !== 'ready' && phase !== 'saving' && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {(phase === 'ready' || phase === 'saving') && (
        <div className="space-y-4">
          {message && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {semesters.length} semester(s) · {totalRows} subject(s)
            </span>
            <button
              type="button"
              onClick={() => setShowRaw((s) => !s)}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              {showRaw ? 'Hide' : 'Show'} raw text
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              + More images
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {showRaw && (
            <pre className="max-h-60 overflow-auto rounded-lg border border-gray-200 bg-gray-900 p-4 text-xs text-gray-100">
              {rawText}
            </pre>
          )}

          {semesters.map((sem) => (
            <div key={sem.key} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Semester</label>
                  <input
                    type="number"
                    value={sem.number}
                    onChange={(e) => updateSemester(sem.key, { number: Number(e.target.value) })}
                    className={`${inputClass} w-20`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">SGPA</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sem.sgpa}
                    onChange={(e) => updateSemester(sem.key, { sgpa: e.target.value })}
                    placeholder="9.05"
                    className={`${inputClass} w-24`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">CGPA</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sem.cgpa}
                    onChange={(e) => updateSemester(sem.key, { cgpa: e.target.value })}
                    placeholder="9.05"
                    className={`${inputClass} w-24`}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500">Academic Year</label>
                  <input
                    type="text"
                    value={sem.academicYear}
                    onChange={(e) => updateSemester(sem.key, { academicYear: e.target.value })}
                    placeholder="2024-2025"
                    className={`${inputClass} max-w-40`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSemester(sem.key)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  Remove semester
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                      <th className="py-1.5 pr-2 font-medium">Subject</th>
                      <th className="py-1.5 pr-2 font-medium">Code</th>
                      <th className="w-20 py-1.5 pr-2 font-medium">Credits</th>
                      <th className="w-24 py-1.5 pr-2 font-medium">Grade</th>
                      <th className="w-24 py-1.5 pr-2 font-medium">Marks</th>
                      <th className="w-10 py-1.5 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {sem.rows.map((row) => (
                      <tr key={row.key} className="border-b border-gray-100">
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => updateRow(sem.key, row.key, { name: e.target.value })}
                            placeholder="Course name"
                            className={`${inputClass} mt-0`}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={row.code}
                            onChange={(e) => updateRow(sem.key, row.key, { code: e.target.value.toUpperCase() })}
                            placeholder="UCEST105"
                            className={`${inputClass} mt-0`}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            step="0.1"
                            value={row.credits}
                            onChange={(e) => updateRow(sem.key, row.key, { credits: e.target.value })}
                            className={`${inputClass} mt-0`}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            list="transcript-grades"
                            value={row.grade}
                            onChange={(e) => updateRow(sem.key, row.key, { grade: e.target.value.toUpperCase() })}
                            className={`${inputClass} mt-0`}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={row.marks}
                            onChange={(e) => updateRow(sem.key, row.key, { marks: e.target.value })}
                            placeholder="—"
                            className={`${inputClass} mt-0`}
                          />
                        </td>
                        <td className="py-1.5">
                          <button
                            type="button"
                            onClick={() => removeRow(sem.key, row.key)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={() => addRow(sem.key)}
                className="mt-2 rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                + Add subject
              </button>
            </div>
          ))}

          <datalist id="transcript-grades">
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Spinner className="h-4 w-4 text-white" />}
              {saving ? 'Importing...' : `Import ${totalRows} result${totalRows === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}