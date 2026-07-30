// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ─── User ─────────────────────────────────────────────────────────────────────
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  LINKEDIN = 'LINKEDIN',
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  provider: AuthProvider;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Resume ────────────────────────────────────────────────────────────────────
export enum ResumeStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  ANALYZED = 'ANALYZED',
  FAILED = 'FAILED',
}

export interface Resume {
  id: string;
  userId: string;
  filename: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  status: ResumeStatus;
  parsedData?: ParsedResume;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedResume {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  languages: string[];
  totalYearsExperience: number;
  seniorityLevel: SeniorityLevel;
}

export interface WorkExperience {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  skills: string[];
  achievements: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: number;
}

export interface Certification {
  name: string;
  issuer: string;
  date?: string;
  expiryDate?: string;
  credentialId?: string;
}

export enum SeniorityLevel {
  INTERN = 'INTERN',
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
  PRINCIPAL = 'PRINCIPAL',
  STAFF = 'STAFF',
}

// ─── Job ──────────────────────────────────────────────────────────────────────
export interface Job {
  id: string;
  userId: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  remote: boolean;
  salary?: SalaryRange;
  requiredSkills: string[];
  preferredSkills: string[];
  experience?: string;
  education?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────
export enum AnalysisStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Analysis {
  id: string;
  userId: string;
  resumeId: string;
  jobId: string;
  status: AnalysisStatus;
  matchScore: number;
  atsScore: number;
  skillGaps: SkillGap[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  atsSuggestions: AtsSuggestion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillGap {
  skill: string;
  importance: SkillImportance;
  currentLevel: number;
  requiredLevel: number;
  category: SkillCategory;
}

export enum SkillImportance {
  CRITICAL = 'CRITICAL',
  IMPORTANT = 'IMPORTANT',
  NICE_TO_HAVE = 'NICE_TO_HAVE',
}

export enum SkillCategory {
  TECHNICAL = 'TECHNICAL',
  SOFT = 'SOFT',
  DOMAIN = 'DOMAIN',
  TOOL = 'TOOL',
  CERTIFICATION = 'CERTIFICATION',
}

export interface AtsSuggestion {
  type: AtsIssueType;
  message: string;
  severity: IssueSeverity;
  suggestion: string;
}

export enum AtsIssueType {
  KEYWORD_MISSING = 'KEYWORD_MISSING',
  FORMAT_ISSUE = 'FORMAT_ISSUE',
  LENGTH_ISSUE = 'LENGTH_ISSUE',
  SECTION_MISSING = 'SECTION_MISSING',
  QUANTIFICATION_MISSING = 'QUANTIFICATION_MISSING',
}

export enum IssueSeverity {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

// ─── Recommendations ──────────────────────────────────────────────────────────
export enum RecommendationType {
  PROJECT = 'PROJECT',
  CERTIFICATION = 'CERTIFICATION',
  COURSE = 'COURSE',
}

export interface Recommendation {
  id: string;
  userId: string;
  analysisId: string;
  type: RecommendationType;
  title: string;
  description: string;
  url?: string;
  duration?: string;
  difficulty: DifficultyLevel;
  priority: number;
  skills: string[];
  createdAt: Date;
}

export enum DifficultyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

// ─── Roadmap ──────────────────────────────────────────────────────────────────
export interface Roadmap {
  id: string;
  userId: string;
  analysisId: string;
  title: string;
  targetRole: string;
  targetDate: Date;
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  week: number;
  tasks: RoadmapTask[];
  completed: boolean;
}

export interface RoadmapTask {
  id: string;
  title: string;
  description: string;
  type: RecommendationType;
  completed: boolean;
  url?: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
}

// ─── Market Demand ────────────────────────────────────────────────────────────
export interface SkillMarketData {
  id: string;
  skill: string;
  demandScore: number;
  trend: TrendDirection;
  averageSalary?: number | null;
  jobCount: number;
  topCompanies: string[];
  relatedSkills: string[];
  lastUpdated: Date;
  createdAt: Date;
}

/** @deprecated Use SkillMarketData instead */
export interface MarketDemand {
  skill: string;
  demandScore: number;
  trend: TrendDirection;
  averageSalary: number;
  jobCount: number;
  topCompanies: string[];
  relatedSkills: string[];
}

export enum TrendDirection {
  RISING = 'RISING',
  STABLE = 'STABLE',
  DECLINING = 'DECLINING',
}

// ─── Coaching ─────────────────────────────────────────────────────────────────
export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string; // ISO string
}

export interface CoachingSession {
  id: string;
  userId: string;
  title?: string | null;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
