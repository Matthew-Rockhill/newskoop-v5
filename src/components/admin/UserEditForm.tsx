'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Fieldset } from '@/components/ui/fieldset';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';

// User type definition
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string | null;
  userType: 'STAFF' | 'RADIO';
  staffRole?: 'SUPERADMIN' | 'ADMIN' | 'EDITOR' | 'SUB_EDITOR' | 'JOURNALIST' | 'INTERN' | null;
  translationLanguage?: 'AFRIKAANS' | 'XHOSA' | null;
  isActive: boolean;
  isPrimaryContact: boolean;
  radioStationId?: string | null;
  radioStation?: {
    id: string;
    name: string;
    province: string;
  } | null;
};

const userEditSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  mobileNumber: z.string().optional(),
  userType: z.enum(['STAFF', 'RADIO']),
  staffRole: z.enum(['SUPERADMIN', 'ADMIN', 'EDITOR', 'SUB_EDITOR', 'JOURNALIST', 'INTERN']).optional(),
  translationLanguage: z.enum(['AFRIKAANS', 'XHOSA']).optional().nullable(),
  isActive: z.boolean(),
});

type UserEditFormData = z.infer<typeof userEditSchema>;

interface UserEditFormProps {
  user: User;
}

export function UserEditForm({ user }: UserEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobileNumber: user.mobileNumber || '',
      userType: user.userType,
      staffRole: user.staffRole || undefined,
      translationLanguage: user.translationLanguage || null,
      isActive: user.isActive,
    },
  });

  const userType = watch('userType');

  const onSubmit = async (data: UserEditFormData) => {
    setIsSubmitting(true);
    try {
      // Remove translation language for radio users
      const submitData = { ...data };
      if (data.userType === 'RADIO') {
        delete submitData.translationLanguage;
        delete submitData.staffRole;
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      toast.success('User updated successfully');
      router.push(`/admin/users/${user.id}`);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/admin/users/${user.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit User"
        action={{
          label: "Cancel",
          onClick: handleCancel
        }}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <Fieldset>
          <Heading level={2}>Basic Information</Heading>
          <Text className="mt-1">Update the user&apos;s basic information and contact details.</Text>
          
          <div className="mt-6 flex items-center gap-4">
            <Avatar 
              name={`${user.firstName} ${user.lastName}`}
              className="size-16" 
            />
            <div>
              <div className="font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-sm text-gray-500">
                User ID: {user.id}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
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

            <div>
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

            <div>
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
          <Heading level={2}>Role & Permissions</Heading>
          <Text className="mt-1">Configure the user&apos;s role and access permissions.</Text>
          
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
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

        {/* Station Assignment */}
        {user.radioStation && (
          <Fieldset>
            <Heading level={2}>Station Assignment</Heading>
            <Text className="mt-1">Current station assignment for this user.</Text>
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="font-medium text-blue-900">{user.radioStation.name}</div>
                <div className="text-sm text-blue-700">
                  {user.radioStation.province.replace('_', ' ')}
                </div>
                {user.isPrimaryContact && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Primary Contact
                  </span>
                )}
              </div>
              <div className="mt-2 text-sm text-blue-600">
                To change station assignment, please contact an administrator.
              </div>
            </div>
          </Fieldset>
        )}

        {/* Account Status */}
        <Fieldset>
          <Heading level={2}>Account Status</Heading>
          <Text className="mt-1">Control the user&apos;s account status and access.</Text>
          
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">Active Status</div>
                <div className="text-sm text-gray-500">
                  When disabled, the user will not be able to access the system.
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
            type="button" 
            onClick={handleCancel}
            outline
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            color="primary"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
} 