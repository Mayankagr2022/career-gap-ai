import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    password: string;
}, {
    name: string;
    email: string;
    password: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    token: string;
}, {
    password: string;
    token: string;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export declare const createJobSchema: z.ZodObject<{
    title: z.ZodString;
    company: z.ZodString;
    description: z.ZodString;
    location: z.ZodOptional<z.ZodString>;
    remote: z.ZodDefault<z.ZodBoolean>;
    salary: z.ZodOptional<z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        min: number;
        max: number;
        currency: string;
    }, {
        min: number;
        max: number;
        currency?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    title: string;
    company: string;
    remote: boolean;
    location?: string | undefined;
    salary?: {
        min: number;
        max: number;
        currency: string;
    } | undefined;
}, {
    description: string;
    title: string;
    company: string;
    location?: string | undefined;
    remote?: boolean | undefined;
    salary?: {
        min: number;
        max: number;
        currency?: string | undefined;
    } | undefined;
}>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export declare const createAnalysisSchema: z.ZodObject<{
    resumeId: z.ZodString;
    jobId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    resumeId: string;
    jobId: string;
}, {
    resumeId: string;
    jobId: string;
}>;
export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    avatar: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    avatar?: string | undefined;
}, {
    name?: string | undefined;
    avatar?: string | undefined;
}>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export type PaginationInput = z.infer<typeof paginationSchema>;
//# sourceMappingURL=index.d.ts.map