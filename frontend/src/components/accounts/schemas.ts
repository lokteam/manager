import { z } from 'zod'

export const accountSchema = z.object({
  api_id: z.coerce.number().int().positive('API ID must be a positive integer'),
  api_hash: z.string().min(1, 'API Hash is required'),
  phone: z.string().min(1, 'Phone number is required'),
  name: z.string().optional(),
  username: z.string().optional(),
})

export const codeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
})

export type AccountForm = z.infer<typeof accountSchema>
export type CodeForm = z.infer<typeof codeSchema>
