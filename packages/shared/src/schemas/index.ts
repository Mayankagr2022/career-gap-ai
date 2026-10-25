import { z } from 'zod';

// ─── Auth Schemas ─────────────────────────────────────────────────────────────
/**
 * The password rule for registration, password reset and password change. The API enforces the same rule
 * (apps/api/src/common/validation/password.ts); a test in the API keeps the two in step.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─── Job Schemas ───────────────────────────────────────────────────────────────
export const createJobSchema = z.object({
  title: z.string().min(2, 'Job title is required').max(200),
  company: z.string().min(1, 'Company name is required').max(200),
  description: z.string().min(100, 'Job description must be at least 100 characters'),
  location: z.string().optional(),
  remote: z.boolean().default(false),
  salary: z
    .object({
      min: z.number().positive(),
      max: z.number().positive(),
      currency: z.string().default('USD'),
    })
    .optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

// ─── Analysis Schemas ─────────────────────────────────────────────────────────
export const createAnalysisSchema = z.object({
  resumeId: z.string().uuid('Invalid resume ID'),
  jobId: z.string().uuid('Invalid job ID'),
});

export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;

// ─── Profile Schemas ──────────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().url().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─── Pagination Schema ────────────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
