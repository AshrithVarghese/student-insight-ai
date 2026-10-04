import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudents } from '../hooks/useStudents'
import { useAuth } from '../contexts/AuthContext'
import { LoadingState } from '../components/ui/LoadingState'
import { registerFace } from '../lib/mlClient'

type FaceStatus =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'CAMERA_READY'
  | 'CAMERA_ERROR'
  | 'DETECTING'
  | 'UNKNOWN_FACE'
  | 'MATCH_FOUND'

interface MatchResult {
  matched: boolean
  student?: { student_id: string; name: string; department: string; batch: string }
  confidence?: number
}

export default function FaceRecognition() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [status, setStatus] = useState<FaceStatus>('IDLE')
  const [error, setError] = useState<string | null>(null)
  const [match, setMatch] = useState<MatchResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const mlBaseUrl = (import.meta.env.VITE_ML_SERVICE_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

  const { data: students } = useStudents()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'ADMIN'

  const [enrollStudentId, setEnrollStudentId] = useState('')
  const [enrollFileName, setEnrollFileName] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null)
  const enrollInputRef = useRef<HTMLInputElement | null>(null)

  const fileToBase64 = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Could not read the image file.'))
      reader.readAsDataURL(file)
    })
  }, [])

  const handleEnrollFile = async (file: File | undefined) => {
    if (!file) return
    setEnrollError(null)
    setEnrollSuccess(null)
    if (!file.type.startsWith('image/')) {
      setEnrollError('Please choose an image file.')
      return
    }

    setEnrolling(true)
    setEnrollFileName(file.name)
    try {
      const base64 = await fileToBase64(file)
      const result = await registerFace(enrollStudentId, base64)
      setEnrollSuccess(
        `Face enrolled for ${result.studentId} (detection confidence ${(result.confidence * 100).toFixed(1)}%).`,
      )
    } catch (err) {
      setEnrollError((err as Error).message)
      if (enrollInputRef.current) enrollInputRef.current.value = ''
      setEnrollFileName('')
    } finally {
      setEnrolling(false)
      if (enrollInputRef.current) enrollInputRef.current.value = ''
    }
  }

  const startCamera = useCallback(async () => {
    setError(null)
    setStatus('REQUESTING_PERMISSION')
    setMatch(null)

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })

      streamRef.current = mediaStream
      setStream(mediaStream)
      setStatus('CAMERA_READY')

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
        setVideoReady(true)
      }
    } catch {
      setStatus('CAMERA_ERROR')
      setError(
        'Unable to access the camera. Please ensure camera permissions are granted and you are using HTTPS.',
      )
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
    setVideoReady(false)
    setStatus('IDLE')
    setCapturedImage(null)
  }, [])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  }, [])

  const identify = useCallback(async () => {
    if (!stream || !videoReady) {
      await startCamera()
      return
    }

    setScanning(true)
    setStatus('DETECTING')
    setError(null)
    setMatch(null)

    try {
      const image = captureFrame()
      if (!image) {
        setError('Could not capture a frame from the camera.')
        setScanning(false)
        setStatus('CAMERA_READY')
        return
      }

      setCapturedImage(image)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(`${mlBaseUrl}/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: image }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        if (body?.error?.code === 'UNKNOWN_FACE') {
          setStatus('UNKNOWN_FACE')
          setMatch({ matched: false })
        } else if (body?.error?.code === 'NO_FACE') {
          setError('No face detected in the frame. Please look directly at the camera.')
          setStatus('CAMERA_READY')
        } else {
          throw new Error(body?.error?.message ?? 'Face identification failed')
        }
        return
      }

      const resultData = await response.json()
      const {
        data,
      }: {
        data: { student: { student_id: string; name: string }; confidence: number }
      } = resultData

      const student = students?.find((s) => s.student_id === data.student.student_id)

      setStatus('MATCH_FOUND')
      setMatch({
        matched: true,
        student: {
          student_id: data.student.student_id,
          name: data.student.name,
          department: student?.department ?? '',
          batch: student?.batch ?? '',
        },
        confidence: data.confidence,
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('The identification request timed out. Please try again.')
      } else if (err instanceof TypeError) {
        setError(
          'The ML service is not reachable. Start the Python service or check ML_SERVICE_URL.',
        )
      } else {
        setError((err as Error).message)
      }
      setStatus('CAMERA_READY')
    } finally {
      setScanning(false)
    }
  }, [stream, videoReady, startCamera, captureFrame, mlBaseUrl, students])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Face Recognition</h1>
        <p className="mt-1 text-sm text-gray-500">
          Identify a registered student using the live camera feed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-black shadow-sm">
            <div className="relative aspect-[4/3]">
              {stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-gray-400">
                  <svg
                    className="h-16 w-16"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <p className="mt-3 text-sm">
                    {status === 'REQUESTING_PERMISSION'
                      ? 'Requesting camera access...'
                      : status === 'CAMERA_ERROR'
                        ? error
                        : 'Camera is off'}
                  </p>
                </div>
              )}

              {(status === 'DETECTING' || scanning) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="relative rounded-xl border-2 border-blue-400 p-24 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]">
                    <LoadingState message="Detecting face..." />
                  </div>
                </div>
              )}

              {status === 'UNKNOWN_FACE' && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
                  <div className="rounded-xl border-2 border-red-400 bg-black/60 p-6 text-center">
                    <p className="text-lg font-semibold text-white">Unknown Face</p>
                    <p className="mt-1 text-sm text-red-200">
                      This face does not match any registered student.
                    </p>
                  </div>
                </div>
              )}

              {status === 'MATCH_FOUND' && match?.matched && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-900/40">
                  <div className="rounded-xl border-2 border-green-400 bg-black/60 p-6 text-center">
                    <p className="text-lg font-semibold text-white">Match Found</p>
                    <p className="mt-1 text-sm text-green-200">
                      Identity verified with {(match.confidence ?? 0).toFixed(1)}% confidence
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {!stream ? (
              <button
                onClick={startCamera}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Start Camera
              </button>
            ) : (
              <>
                <button
                  onClick={identify}
                  disabled={scanning}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {scanning ? 'Identifying...' : 'Identify Person'}
                </button>
                <button
                  onClick={stopCamera}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Stop Camera
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 text-xs font-medium text-red-500 hover:text-red-600"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {isAdmin && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">Enroll a Student Face</h2>
              <p className="mt-1 text-sm text-gray-500">
                Generate and store a face embedding so this student can be recognized.
              </p>

              <div className="mt-4 space-y-3">
                <select
                  value={enrollStudentId}
                  disabled={enrolling}
                  onChange={(e) => {
                    setEnrollStudentId(e.target.value)
                    setEnrollError(null)
                    setEnrollSuccess(null)
                  }}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Select a student...</option>
                  {students?.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.name} ({s.student_id})
                    </option>
                  ))}
                </select>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2.5 text-sm">
                  <span className="truncate text-gray-600">
                    {enrollFileName || 'Choose a clear, front-facing photo...'}
                  </span>
                  <span className="shrink-0 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    {enrolling ? 'Enrolling...' : 'Browse'}
                  </span>
                  <input
                    ref={enrollInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={enrolling}
                    onChange={(e) => handleEnrollFile(e.target.files?.[0])}
                  />
                </label>

                {enrollError && <p className="text-xs text-red-600">{enrollError}</p>}
                {enrollSuccess && <p className="text-xs text-green-600">{enrollSuccess}</p>}
              </div>
            </div>
          )}

          {!match && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">How it works</h2>
              <ol className="mt-4 space-y-3">
                {[
                  'Grant camera access when prompted',
                  "Position the student's face within the frame",
                  'Click "Identify Person" to run face matching',
                  'The matched student profile will open below',
                ].map((step, index) => (
                  <li key={step} className="flex items-start gap-3 text-sm text-gray-600">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                <p className="font-semibold">Privacy notice</p>
                <p className="mt-1">
                  Camera frames are processed by the institution's ML service and are not stored.
                  Facial data is protected and never exposed to the browser.
                </p>
              </div>
            </div>
          )}

          {match?.matched && match.student && (
            <div className="overflow-hidden rounded-xl border border-green-200 bg-white shadow-sm">
              <div className="bg-green-600 px-6 py-3">
                <p className="text-sm font-semibold text-white">Student Identified</p>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-700">
                    {match.student.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{match.student.name}</h3>
                    <p className="text-sm text-gray-500">
                      {match.student.student_id}
                      {match.student.department ? ` · ${match.student.department}` : ''}
                      {match.student.batch ? ` · Batch ${match.student.batch}` : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <Link
                    to={`/students/${match.student.student_id}`}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    Open Profile
                  </Link>
                  <Link
                    to={`/students/${match.student.student_id}/analytics`}
                    className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-center text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    View Analytics
                  </Link>
                </div>
              </div>
            </div>
          )}

          {match && !match.matched && (
            <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Not recognized</h3>
                  <p className="text-sm text-gray-500">
                    The captured face does not match any registered student.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMatch(null)
                  setCapturedImage(null)
                }}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          )}

          {capturedImage && match?.matched && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">Captured Frame</h3>
              <img
                src={capturedImage}
                alt="Captured frame"
                className="mt-3 w-full rounded-lg border border-gray-200"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}