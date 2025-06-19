import { User as PrismaUser, UserType as PrismaUserType, StaffRole as PrismaStaffRole, Station } from '@prisma/client';

export type UserType = PrismaUserType;
export type StaffRole = PrismaStaffRole;

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

export { UserType, StaffRole, Province, TranslationLanguage };

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