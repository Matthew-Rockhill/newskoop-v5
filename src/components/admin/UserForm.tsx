'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userFormSchema } from '@/lib/validations';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Fieldset, Field, Label, ErrorMessage } from '@/components/ui/fieldset';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { z } from 'zod';

type UserFormData = z.infer<typeof userFormSchema>;

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
    resolver: zodResolver(userFormSchema),
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
          <Field>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              {...register('firstName')}
              id="firstName"
              className="mt-2"
              invalid={!!errors.firstName}
            />
            {errors.firstName && (
              <ErrorMessage>{errors.firstName.message}</ErrorMessage>
            )}
          </Field>

          <Field>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              {...register('lastName')}
              id="lastName"
              className="mt-2"
              invalid={!!errors.lastName}
            />
            {errors.lastName && (
              <ErrorMessage>{errors.lastName.message}</ErrorMessage>
            )}
          </Field>

          <Field className="sm:col-span-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              {...register('email')}
              id="email"
              type="email"
              className="mt-2"
              invalid={!!errors.email}
            />
            {errors.email && (
              <ErrorMessage>{errors.email.message}</ErrorMessage>
            )}
          </Field>

          <Field className="sm:col-span-2">
            <Label htmlFor="mobileNumber">Mobile Number</Label>
            <Input
              {...register('mobileNumber')}
              id="mobileNumber"
              type="tel"
              className="mt-2"
              invalid={!!errors.mobileNumber}
            />
            {errors.mobileNumber && (
              <ErrorMessage>{errors.mobileNumber.message}</ErrorMessage>
            )}
          </Field>
        </div>
      </Fieldset>

      {/* Role Information */}
      <Fieldset>
        <Heading level={3}>Role & Permissions</Heading>
        <Text className="mt-1">Configure the user&apos;s role and access permissions.</Text>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="userType">User Type</Label>
            <Select
              {...register('userType')}
              id="userType"
              className="mt-2"
              invalid={!!errors.userType}
            >
              <option value="STAFF">Staff</option>
              <option value="RADIO">Radio Station User</option>
            </Select>
            {errors.userType && (
              <ErrorMessage>{errors.userType.message}</ErrorMessage>
            )}
          </Field>

          {userType === 'STAFF' && (
            <Field>
              <Label htmlFor="staffRole">Staff Role</Label>
              <Select
                {...register('staffRole')}
                id="staffRole"
                className="mt-2"
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
                <ErrorMessage>{errors.staffRole.message}</ErrorMessage>
              )}
            </Field>
          )}

          {userType === 'STAFF' && (
            <Field>
              <Label htmlFor="translationLanguage">Translation Language</Label>
              <Select
                {...register('translationLanguage')}
                id="translationLanguage"
                className="mt-2"
                invalid={!!errors.translationLanguage}
              >
                <option value="">None</option>
                <option value="AFRIKAANS">Can translate to Afrikaans</option>
                <option value="XHOSA">Can translate to Xhosa</option>
                <option value="ZULU">Can translate to Zulu</option>
              </Select>
              {errors.translationLanguage && (
                <ErrorMessage>{errors.translationLanguage.message}</ErrorMessage>
              )}
            </Field>
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
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Active Status</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                When active, the user will be able to access the system.
              </div>
            </div>
            <Switch
              checked={watch('isActive')}
              onChange={(checked) => setValue('isActive', checked)}
              color="green"
              aria-label="Toggle account active status"
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