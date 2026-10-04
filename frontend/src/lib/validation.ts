import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const studentSchema = z.object({
  student_id: z.string().min(1, 'Student ID is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email').optional().nullable(),
  department: z.string().min(1, 'Department is required'),
  batch: z.string().min(1, 'Batch is required'),
  date_of_birth: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  profile_photo_url: z.string().url('Enter a valid URL').optional().nullable(),
})