import { 
  User as PrismaUser, 
  UserType as PrismaUserType, 
  StaffRole as PrismaStaffRole, 
  Province as PrismaProvince,
  TranslationLanguage as PrismaTranslationLanguage,
  ContentLanguage,
  StoryStatus,
  StoryPriority,
  Station,
  TaskPriority as PrismaTaskPriority,
  TaskType as PrismaTaskType,
  TaskStatus as PrismaTaskStatus,
  Task as PrismaTask,
  WorkflowStage,
  TranslationStatus,
  TranslationTask as PrismaTranslationTask
} from '@prisma/client';

export type UserType = PrismaUserType;
export type StaffRole = PrismaStaffRole;
export type Province = PrismaProvince;
export type TranslationLanguage = PrismaTranslationLanguage;

export type User = Omit<PrismaUser, 'password'>;

export interface UserWithStation extends User {
  station?: Station;
}

export interface UserFilters {
  query?: string;
  userType?: UserType;
  staffRole?: StaffRole;
  isActive?: boolean;
  page?: number;
}

export interface StationFilters {
  query?: string;
  province?: Province;
  isActive?: boolean;
  page?: number;
}

export interface Pagination {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
}

export interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
  password?: string;
  userType: UserType;
  staffRole?: StaffRole;
  translationLanguage?: TranslationLanguage;
  radioStationId?: string;
  isPrimaryContact?: boolean;
  isActive: boolean;
}

export interface StationFormData {
  name: string;
  description?: string;
  logoUrl?: string;
  province: Province;
  contactNumber?: string;
  contactEmail?: string;
  website?: string;
  isActive: boolean;
}

export type { UserType, StaffRole, Province, TranslationLanguage };

// Task Types
export type TaskPriority = PrismaTaskPriority;
export type TaskType = PrismaTaskType;
export type TaskStatus = PrismaTaskStatus;

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToId: string;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    staffRole?: StaffRole;
  };
  createdById: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    staffRole?: StaffRole;
  };
  contentType: string;
  contentId?: string;
  story?: {
    id: string;
    title: string;
    slug: string;
    status: StoryStatus;
    language: ContentLanguage;
  };
  sourceLanguage?: ContentLanguage;
  targetLanguage?: ContentLanguage;
  dueDate?: string;
  scheduledFor?: string;
  completedAt?: string;
  blockedBy?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationTask {
  id: string;
  storyId: string;
  story: {
    id: string;
    title: string;
  };
  language: ContentLanguage;
  status: TranslationStatus;
  translatorId: string;
  translator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewerId: string;
  reviewer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  content?: string;
  revisionNotes?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
}

export interface TaskFilters {
  query?: string;
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
  assignedToId?: string;
  contentId?: string;
  page?: number;
  perPage?: number;
}

export interface TaskFormData {
  type: TaskType;
  title: string;
  description?: string;
  priority: TaskPriority;
  assignedToId: string;
  contentType: string;
  contentId?: string;
  sourceLanguage?: ContentLanguage;
  targetLanguage?: ContentLanguage;
  dueDate?: Date;
  scheduledFor?: Date;
  metadata?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  userId: string;
  user: User;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  user: User;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser extends User {
  accessToken?: string;
} 