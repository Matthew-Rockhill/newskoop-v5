import { z } from 'zod';
import { StaffRole, UserType, TranslationLanguage, Province } from '@prisma/client';

// Base user schema
const baseUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Staff user schema
export const staffUserSchema = baseUserSchema.extend({
  userType: z.literal(UserType.STAFF),
  staffRole: z.nativeEnum(StaffRole),
  translationLanguages: z.array(z.nativeEnum(TranslationLanguage)).optional(),
});

// Radio user schema
export const radioUserSchema = baseUserSchema.extend({
  userType: z.literal(UserType.RADIO),
  stationId: z.string().uuid(),
  isPrimaryContact: z.boolean().default(false),
});

// Combined user schema for create/update
export const userSchema = z.discriminatedUnion('userType', [
  staffUserSchema,
  radioUserSchema,
]);

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
  stationId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  perPage: z.number().int().positive().default(10),
}); 