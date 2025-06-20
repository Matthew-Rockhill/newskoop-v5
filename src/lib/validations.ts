import { z } from 'zod';
import { StaffRole, UserType, TranslationLanguage, Province } from '@prisma/client';

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
  translationLanguage: z.nativeEnum(TranslationLanguage).optional(),
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
  page: z.number().int().positive().default(1),
  perPage: z.number().int().positive().default(10),
}); 