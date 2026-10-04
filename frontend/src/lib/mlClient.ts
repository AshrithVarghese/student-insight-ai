import axios from 'axios'
import type { CareerRecommendation, CgpaPrediction } from '../types'

const mlBaseUrl = import.meta.env.VITE_ML_SERVICE_URL ?? 'http://localhost:8000'

const mlClient = axios.create({
  baseURL: mlBaseUrl,
  timeout: 30000,
})

export interface CgpaPredictionRequest {
  previousCgpa: number
  attendance: number
  internalScore: number
  projectScore: number
  recentGpa?: number
}

export interface CareerRecommendationRequest {
  skills: { name: string; proficiency: string }[]
  projects: { technologies: string[] }[]
  certifications: { name: string; issuer?: string | null }[]
  cgpa?: number | null
  subjectPerformance?: { name: string; marks: number }[]
  interests?: string[]
}

export async function predictCgpa(payload: CgpaPredictionRequest): Promise<CgpaPrediction> {
  try {
    const { data } = await mlClient.post<CgpaPrediction>('/predict/cgpa', payload)
    return data
  } catch {
    return {
      predictedCgpa: null,
      modelVersion: null,
      status: 'MODEL_UNAVAILABLE',
      basedOn: [],
    }
  }
}

export async function getCareerRecommendations(
  payload: CareerRecommendationRequest,
): Promise<CareerRecommendation[]> {
  const { data } = await mlClient.post<{
    data: { recommendations: CareerRecommendation[] }
  }>('/recommend/career', payload)
  return data.data?.recommendations ?? []
}

export async function getPerformanceSummary(
  payload: Record<string, unknown>,
): Promise<{ summary: string }> {
  try {
    const { data } = await mlClient.post<{ data: { summary: string } }>('/summary/generate', payload)
    return data.data ?? { summary: 'Unable to generate summary at this time.' }
  } catch {
    return { summary: 'Unable to generate summary at this time.' }
  }
}

export interface FaceEnrollment {
  studentId: string
  confidence: number
}

export async function registerFace(
  studentId: string,
  imageBase64: string,
): Promise<FaceEnrollment> {
  const { data } = await mlClient.post<{ data: FaceEnrollment }>('/register-face', {
    studentId,
    imageBase64,
  })
  return data.data ?? { studentId, confidence: 0 }
}