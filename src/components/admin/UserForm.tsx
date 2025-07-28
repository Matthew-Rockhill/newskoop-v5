'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Fieldset } from '@/components/ui/fieldset';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  mobileNumber: z.string().optional(),
  userType: z.enum(['STAFF', 'RADIO']),
  staffRole: z.enum(['SUPERADMIN', 'ADMIN', 'EDITOR', 'SUB_EDITOR', 'JOURNALIST', 'INTERN']).optional(),
  translationLanguage: z.union([
    z.literal(''),
    z.enum(['AFRIKAANS', 'XHOSA']),
    z.undefined()
  ]).optional().transform((val) => {
    return val === '' ? undefined : val;
  }),
  isActive: z.boolean(),
}).refine((data) => {
  // For STAFF users, staffRole is required
  if (data.userType === 'STAFF' && !data.staffRole) {
    return false;
  }
  return true;
}, {
  message: "Staff role is required for staff users",
  path: ["staffRole"],
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: UserFormData;
  onSubmit: (data: UserFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function UserForm({ user, onSubmit, isSubmitting }: UserFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      mobileNumber: user?.mobileNumber || '',
      userType: user?.userType || 'STAFF',
      staffRole: user?.staffRole || undefined,
      translationLanguage: user?.translationLanguage || undefined,
      isActive: user?.isActive ?? true,
    },
  });

  const userType = watch('userType');

  const handleFormSubmit = async (data: UserFormData) => {
    // Remove translation language for radio users
    const submitData = { ...data };
    if (data.userType === 'RADIO') {
      delete submitData.translationLanguage;
      delete submitData.staffRole;
    }
    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Fieldset>
        <Heading level={3}>Basic Information</Heading>
        <Text className="mt-1">Enter the user&apos;s basic information and contact details.</Text>
        
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <Input
              {...register('firstName')}
              id="firstName"
              className="mt-1"
              invalid={!!errors.firstName}
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <Input
              {...register('lastName')}
              id="lastName"
              className="mt-1"
              invalid={!!errors.lastName}
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <Input
              {...register('email')}
              id="email"
              type="email"
              className="mt-1"
              invalid={!!errors.email}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700">
              Mobile Number
            </label>
            <Input
              {...register('mobileNumber')}
              id="mobileNumber"
              type="tel"
              className="mt-1"
              invalid={!!errors.mobileNumber}
            />
            {errors.mobileNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.mobileNumber.message}</p>
            )}
          </div>
        </div>
      </Fieldset>

      {/* Role Information */}
      <Fieldset>
        <Heading level={3}>Role & Permissions</Heading>
        <Text className="mt-1">Configure the user&apos;s role and access permissions.</Text>
        
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
              User Type
            </label>
            <Select
              {...register('userType')}
              id="userType"
              className="mt-1"
              invalid={!!errors.userType}
            >
              <option value="STAFF">Staff</option>
              <option value="RADIO">Radio Station User</option>
            </Select>
            {errors.userType && (
              <p className="mt-1 text-sm text-red-600">{errors.userType.message}</p>
            )}
          </div>

          {userType === 'STAFF' && (
            <div>
              <label htmlFor="staffRole" className="block text-sm font-medium text-gray-700">
                Staff Role
              </label>
              <Select
                {...register('staffRole')}
                id="staffRole"
                className="mt-1"
                invalid={!!errors.staffRole}
              >
                <option value="">Select role...</option>
                <option value="SUPERADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="EDITOR">Editor</option>
                <option value="SUB_EDITOR">Sub Editor</option>
                <option value="JOURNALIST">Journalist</option>
                <option value="INTERN">Intern</option>
              </Select>
              {errors.staffRole && (
                <p className="mt-1 text-sm text-red-600">{errors.staffRole.message}</p>
              )}
            </div>
          )}

          {userType === 'STAFF' && (
            <div>
              <label htmlFor="translationLanguage" className="block text-sm font-medium text-gray-700">
                Translation Language
              </label>
              <Select
                {...register('translationLanguage')}
                id="translationLanguage"
                className="mt-1"
                invalid={!!errors.translationLanguage}
              >
                <option value="">None</option>
                <option value="AFRIKAANS">Can translate to Afrikaans</option>
                <option value="XHOSA">Can translate to Xhosa</option>
              </Select>
              {errors.translationLanguage && (
                <p className="mt-1 text-sm text-red-600">{errors.translationLanguage.message}</p>
              )}
            </div>
          )}
        </div>
      </Fieldset>

      {/* Account Status */}
      <Fieldset>
        <Heading level={3}>Account Status</Heading>
        <Text className="mt-1">Set the initial account status for the user.</Text>
        
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">Active Status</div>
              <div className="text-sm text-gray-500">
                When active, the user will be able to access the system.
              </div>
            </div>
            <Switch
              checked={watch('isActive')}
              onChange={(checked) => setValue('isActive', checked)}
              color="green"
            />
          </div>
        </div>
      </Fieldset>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          color="primary"
        >
          {isSubmitting ? 'Creating...' : user ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );
} 