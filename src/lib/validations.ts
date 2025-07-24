import { z } from 'zod';
import { StaffRole, UserType, TranslationLanguage, Province, StoryStatus, StoryPriority, CommentType, StoryLanguage } from '@prisma/client';

// Base user schema
const baseUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  mobileNumber: z.string().optional(),
  isActive: z.boolean().default(true),
});

// User creation schema - simplified for user creation form
export const userCreateSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  mobileNumber: z.string().optional(),
  userType: z.nativeEnum(UserType),
  staffRole: z.nativeEnum(StaffRole).optional(),
  translationLanguage: z.string().optional().transform((val) => {
    // Convert empty string to undefined for optional enum validation
    if (val === '' || val === undefined) return undefined;
    return val;
  }).pipe(z.nativeEnum(TranslationLanguage).optional()),
  isActive: z.boolean().default(true),
}).refine((data) => {
  // For STAFF users, staffRole is required
  if (data.userType === UserType.STAFF && !data.staffRole) {
    return false;
  }
  return true;
}, {
  message: "Staff role is required for staff users",
  path: ["staffRole"],
});

// Staff user schema
export const staffUserSchema = baseUserSchema.extend({
  userType: z.literal(UserType.STAFF),
  staffRole: z.nativeEnum(StaffRole),
  translationLanguage: z.nativeEnum(TranslationLanguage).optional(),
});

// Radio user schema
export const radioUserSchema = baseUserSchema.extend({
  userType: z.literal(UserType.RADIO),
  radioStationId: z.string().optional(),
  isPrimaryContact: z.boolean().default(false),
});

// Combined user schema for create/update
export const userSchema = z.discriminatedUnion('userType', [
  staffUserSchema,
  radioUserSchema,
]);

// User update schema for partial updates (without discriminated union)
export const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  mobileNumber: z.string().optional(),
  userType: z.nativeEnum(UserType).optional(),
  staffRole: z.nativeEnum(StaffRole).optional(),
  translationLanguage: z.nativeEnum(TranslationLanguage).optional(),
  translationLanguages: z.array(z.nativeEnum(TranslationLanguage)).optional(),
  radioStationId: z.string().optional(),
  isPrimaryContact: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Station schema
export const stationSchema = z.object({
  name: z.string().min(2),
  province: z.nativeEnum(Province),
  address: z.string().min(5),
  phone: z.string(),
  email: z.string().email(),
  website: z.string().url().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

// Password update schema
export const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

// User search params schema
export const userSearchSchema = z.object({
  query: z.string().optional(),
  userType: z.nativeEnum(UserType).optional(),
  staffRole: z.nativeEnum(StaffRole).optional(),
  radioStationId: z.string().optional(),
  isActive: z.boolean().optional(),
  translationLanguage: z.nativeEnum(TranslationLanguage).optional(),
  page: z.number().int().positive().default(1),
  perPage: z.number().int().positive().default(10),
});

// Station search params schema
export const stationSearchSchema = z.object({
  query: z.string().optional(),
  province: z.nativeEnum(Province).optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  perPage: z.number().int().positive().default(10),
});

// NEWSROOM VALIDATION SCHEMAS

// Story schemas
export const storyCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
  priority: z.nativeEnum(StoryPriority).default(StoryPriority.MEDIUM),
  categoryId: z.string().optional(), // Now optional
  tagIds: z.array(z.string()).optional().default([]),
});

export const storyUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  priority: z.nativeEnum(StoryPriority).optional(),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

export const storyStatusUpdateSchema = z.object({
  status: z.nativeEnum(StoryStatus),
  assignedToId: z.string().optional(),
  reviewerId: z.string().optional(),
  categoryId: z.string().optional(),
  language: z.nativeEnum(StoryLanguage).optional(),
  tagIds: z.array(z.string()).optional(),
});

export const storySearchSchema = z.object({
  query: z.string().optional(),
  status: z.nativeEnum(StoryStatus).optional(),
  priority: z.nativeEnum(StoryPriority).optional(),
  categoryId: z.string().optional(),
  authorId: z.string().optional(),
  assignedToId: z.string().optional(),
  reviewerId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  page: z.number().int().positive().default(1),
  perPage: z.number().int().positive().default(10),
});

// Category schemas
export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional(),
  parentId: z.string().optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional(),
  parentId: z.string().optional(),
});

// Tag schemas
export const tagCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional(),
});

export const tagUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional(),
});

// Comment schemas
export const commentCreateSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  type: z.nativeEnum(CommentType).default(CommentType.GENERAL),
  parentId: z.string().optional(),
  category: z.string().optional(),
});

export const commentUpdateSchema = z.object({
  content: z.string().min(1).optional(),
  type: z.nativeEnum(CommentType).optional(),
  isResolved: z.boolean().optional(),
});

// Audio clip schemas
export const audioClipCreateSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  url: z.string().url(),
  duration: z.number().int().positive().optional(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().min(1),
  description: z.string().optional(),
  storyId: z.string().min(1, 'Story ID is required'),
});

export const audioClipUpdateSchema = z.object({
  description: z.string().optional(),
});

 