'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox, CheckboxField } from '@/components/ui/checkbox';
import { Field, FieldGroup, Fieldset, Label, Description, ErrorMessage } from '@/components/ui/fieldset';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Divider } from '@/components/ui/divider';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { TrashIcon, PlusIcon, InfoIcon } from 'lucide-react';

// Province enum matching Prisma schema
const provinces = [
  'EASTERN_CAPE',
  'FREE_STATE',
  'GAUTENG',
  'KWAZULU_NATAL',
  'LIMPOPO',
  'MPUMALANGA',
  'NORTHERN_CAPE',
  'NORTH_WEST',
  'WESTERN_CAPE'
] as const;

// Form validation schema for editing
const stationEditSchema = z.object({
  // Basic Information
  name: z.string().min(1, 'Station name is required'),
  province: z.enum(provinces, { required_error: 'Province is required' }),
  contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  contactNumber: z.string().optional(),
  isActive: z.boolean(),
  hasContentAccess: z.boolean(),
  
  // Content Filtering
  allowedLanguages: z.array(z.string()).min(1, 'At least one language must be selected'),
  allowedReligions: z.array(z.string()).min(1, 'At least one religion must be selected'),
  blockedCategories: z.array(z.string()),
  
  // Primary Contact (existing user)
  primaryContactId: z.string().min(1, 'Primary contact is required'),
  
  // New Users to Add
  newUsers: z.array(z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    mobileNumber: z.string().optional(),
  }))
});

type StationEditFormData = z.infer<typeof stationEditSchema>;

// Station type with users
type Station = {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  province: string;
  contactNumber?: string | null;
  contactEmail?: string | null;
  website?: string | null;
  isActive: boolean;
  hasContentAccess: boolean;
  allowedLanguages: string[];
  allowedReligions: string[];
  blockedCategories: string[];
  createdAt: Date;
  updatedAt: Date;
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber?: string | null;
    isPrimaryContact: boolean;
  }>;
  _count: {
    users: number;
  };
};

// Helper function to format province names
const formatProvince = (province: string) => {
  return province
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

interface StationEditFormProps {
  station: Station;
}

export default function StationEditForm({ station }: StationEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usersToRemove, setUsersToRemove] = useState<string[]>([]);
  const [categories, setCategories] = useState<Array<{id: string, name: string, level: number}>>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const primaryContact = station.users.find(user => user.isPrimaryContact);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/newsroom/categories?flat=true');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<StationEditFormData>({
    resolver: zodResolver(stationEditSchema),
    defaultValues: {
      name: station.name,
      province: station.province as typeof provinces[number],
      contactEmail: station.contactEmail || '',
      contactNumber: station.contactNumber || '',
      isActive: station.isActive,
      hasContentAccess: station.hasContentAccess,
      allowedLanguages: station.allowedLanguages || ['English', 'Afrikaans', 'Xhosa'],
      allowedReligions: station.allowedReligions || ['Christian', 'Muslim', 'Neutral'],
      blockedCategories: station.blockedCategories || [],
      primaryContactId: primaryContact?.id || '',
      newUsers: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "newUsers"
  });

  const hasContentAccess = watch('hasContentAccess');
  const isActive = watch('isActive');
  const selectedPrimaryContactId = watch('primaryContactId');

  // Reset form with station data when station changes
  useEffect(() => {
    const primaryContact = station.users.find(user => user.isPrimaryContact);
    reset({
      name: station.name,
      province: station.province as typeof provinces[number],
      contactEmail: station.contactEmail || '',
      contactNumber: station.contactNumber || '',
      isActive: station.isActive,
      hasContentAccess: station.hasContentAccess,
      allowedLanguages: station.allowedLanguages || ['English', 'Afrikaans', 'Xhosa'],
      allowedReligions: station.allowedReligions || ['Christian', 'Muslim', 'Neutral'],
      blockedCategories: station.blockedCategories || [],
      primaryContactId: primaryContact?.id || '',
      newUsers: []
    });
  }, [station, reset]);

  const onSubmit: SubmitHandler<StationEditFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      // Update station basic info
      const stationResponse = await fetch(`/api/stations/${station.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          province: data.province,
          contactEmail: data.contactEmail,
          contactNumber: data.contactNumber,
          isActive: data.isActive,
          hasContentAccess: data.hasContentAccess,
          allowedLanguages: data.allowedLanguages,
          allowedReligions: data.allowedReligions,
          blockedCategories: data.blockedCategories,
        }),
      });

      if (!stationResponse.ok) throw new Error('Failed to update station');

      // Update primary contact if changed
      if (data.primaryContactId !== primaryContact?.id) {
        const primaryContactResponse = await fetch(`/api/stations/${station.id}/primary-contact`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ primaryContactId: data.primaryContactId }),
        });

        if (!primaryContactResponse.ok) throw new Error('Failed to update primary contact');
      }

      // Add new users
      if (data.newUsers.length > 0) {
        const newUsersResponse = await fetch(`/api/stations/${station.id}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: data.newUsers }),
        });

        if (!newUsersResponse.ok) throw new Error('Failed to add new users');
      }

      // Remove users
      if (usersToRemove.length > 0) {
        const removeUsersResponse = await fetch(`/api/stations/${station.id}/users`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: usersToRemove }),
        });

        if (!removeUsersResponse.ok) throw new Error('Failed to remove users');
      }

      toast.success('Station updated successfully!');
      router.push(`/admin/stations/${station.id}`);
    } catch (error) {
      toast.error('Failed to update station');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addNewUser = () => {
    append({
      firstName: '',
      lastName: '',
      email: '',
      mobileNumber: '',
    });
  };

  const removeUser = (userId: string) => {
    if (userId === selectedPrimaryContactId) {
      toast.error('Cannot remove the primary contact. Please select a different primary contact first.');
      return;
    }
    setUsersToRemove([...usersToRemove, userId]);
  };

  const undoRemoveUser = (userId: string) => {
    setUsersToRemove(usersToRemove.filter(id => id !== userId));
  };

  const availableUsers = station.users.filter(user => !usersToRemove.includes(user.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Station"
        action={{
          label: "View Station",
          onClick: () => router.push(`/admin/stations/${station.id}`)
        }}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <Fieldset>
          <Heading level={2}>Station Details</Heading>
          <Text className="mt-1">Basic information about the radio station.</Text>
          
          <FieldGroup className="mt-6">
            <Field>
              <Label htmlFor="name">Station Name *</Label>
              <Input
                id="name"
                {...register('name')}
                invalid={!!errors.name}
              />
              {errors.name && (
                <ErrorMessage>{errors.name.message}</ErrorMessage>
              )}
            </Field>

            <Field>
              <Label htmlFor="province">Province *</Label>
              <Select
                id="province"
                {...register('province')}
                invalid={!!errors.province}
              >
                {provinces.map((province) => (
                  <option key={province} value={province}>
                    {formatProvince(province)}
                  </option>
                ))}
              </Select>
              {errors.province && (
                <ErrorMessage>{errors.province.message}</ErrorMessage>
              )}
            </Field>

            <Field>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                {...register('contactEmail')}
                invalid={!!errors.contactEmail}
              />
              {errors.contactEmail && (
                <ErrorMessage>{errors.contactEmail.message}</ErrorMessage>
              )}
            </Field>

            <Field>
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input
                id="contactNumber"
                type="tel"
                {...register('contactNumber')}
              />
            </Field>
          </FieldGroup>
        </Fieldset>

        {/* Station Settings */}
        <Fieldset>
          <Heading level={2}>Station Settings</Heading>
          <Text className="mt-1">Configure station status and access permissions.</Text>
          
          <FieldGroup className="mt-6">
            <CheckboxField>
              <Checkbox
                id="isActive"
                checked={isActive}
                onChange={(checked) => setValue('isActive', checked)}
              />
              <Label>
                Station Active
                <Description>
                  When enabled, this station will be active and accessible to users.
                </Description>
              </Label>
            </CheckboxField>

            <CheckboxField>
              <Checkbox
                id="hasContentAccess"
                checked={hasContentAccess}
                onChange={(checked) => setValue('hasContentAccess', checked)}
              />
              <Label>
                Enable Content Access
                <Description>
                  Allow this station to access all available content.
                </Description>
              </Label>
            </CheckboxField>
          </FieldGroup>
        </Fieldset>

        {/* Content Filtering */}
        <Fieldset>
          <Heading level={2}>Content Filtering</Heading>
          <Text className="mt-1">Configure which content this station can access.</Text>
          
          <FieldGroup className="mt-6">
            <Field>
              <Label>Allowed Languages</Label>
              <Description>Select languages this station can access</Description>
              <div className="mt-2 space-y-2">
                {['English', 'Afrikaans', 'Xhosa'].map((language) => (
                  <CheckboxField key={language}>
                    <Checkbox
                      id={`language-${language}`}
                      checked={watch('allowedLanguages')?.includes(language)}
                      onChange={(checked) => {
                        const current = watch('allowedLanguages') || [];
                        if (checked && !current.includes(language)) {
                          setValue('allowedLanguages', [...current, language]);
                        } else if (!checked) {
                          setValue('allowedLanguages', current.filter(l => l !== language));
                        }
                      }}
                    />
                    <Label>{language}</Label>
                  </CheckboxField>
                ))}
              </div>
              {errors.allowedLanguages && (
                <ErrorMessage>{errors.allowedLanguages.message}</ErrorMessage>
              )}
            </Field>

            <Field>
              <Label>Allowed Religions</Label>
              <Description>Select religious content this station can access</Description>
              <div className="mt-2 space-y-2">
                {['Christian', 'Muslim', 'Neutral'].map((religion) => (
                  <CheckboxField key={religion}>
                    <Checkbox
                      id={`religion-${religion}`}
                      checked={watch('allowedReligions')?.includes(religion)}
                      onChange={(checked) => {
                        const current = watch('allowedReligions') || [];
                        if (checked && !current.includes(religion)) {
                          setValue('allowedReligions', [...current, religion]);
                        } else if (!checked) {
                          setValue('allowedReligions', current.filter(r => r !== religion));
                        }
                      }}
                    />
                    <Label>
                      {religion}
                      {religion === 'Neutral' && <span className="text-sm text-zinc-500 ml-1">(All content)</span>}
                    </Label>
                  </CheckboxField>
                ))}
              </div>
              {errors.allowedReligions && (
                <ErrorMessage>{errors.allowedReligions.message}</ErrorMessage>
              )}
            </Field>

            <Field>
              <Label>Blocked Categories</Label>
              <Description>Select categories to block from this station</Description>
              {loadingCategories ? (
                <div className="text-sm text-zinc-500">Loading categories...</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {categories
                    .filter(cat => cat.level === 1) // Only show level 1 categories
                    .map((category) => (
                      <CheckboxField key={category.id}>
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={watch('blockedCategories')?.includes(category.id)}
                          onChange={(checked) => {
                            const current = watch('blockedCategories') || [];
                            if (checked && !current.includes(category.id)) {
                              setValue('blockedCategories', [...current, category.id]);
                            } else if (!checked) {
                              setValue('blockedCategories', current.filter(c => c !== category.id));
                            }
                          }}
                        />
                        <Label>{category.name}</Label>
                      </CheckboxField>
                    ))}
                </div>
              )}
            </Field>
          </FieldGroup>
        </Fieldset>

        {/* Primary Contact Management */}
        <Fieldset>
          <Heading level={2}>Primary Contact</Heading>
          <Text className="mt-1">Select which user should be the primary contact for this station.</Text>
          
          <FieldGroup className="mt-6">
            <Field>
              <Label htmlFor="primaryContactId">Primary Contact *</Label>
              <Select
                id="primaryContactId"
                {...register('primaryContactId')}
                invalid={!!errors.primaryContactId}
              >
                <option value="">Select a primary contact</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </Select>
              {errors.primaryContactId && (
                <ErrorMessage>{errors.primaryContactId.message}</ErrorMessage>
              )}
            </Field>
          </FieldGroup>
        </Fieldset>

        {/* Existing Users Management */}
        <Fieldset>
          <Heading level={2}>Existing Users</Heading>
          <Text className="mt-1">Manage users currently associated with this station.</Text>
          
          <div className="mt-6 space-y-4">
            {station.users.map((user) => (
              <div
                key={user.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  usersToRemove.includes(user.id) ? 'bg-red-50 border-red-200' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Avatar 
                    name={`${user.firstName} ${user.lastName}`}
                    className="size-10" 
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {user.firstName} {user.lastName}
                      </span>
                      {user.isPrimaryContact && (
                        <Badge color="blue">Primary Contact</Badge>
                      )}
                      {usersToRemove.includes(user.id) && (
                        <Badge color="red">To be removed</Badge>
                      )}
                    </div>
                    <div className="text-sm text-zinc-600">{user.email}</div>
                    {user.mobileNumber && (
                      <div className="text-sm text-zinc-600">{user.mobileNumber}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {usersToRemove.includes(user.id) ? (
                    <Button
                      type="button"
                      onClick={() => undoRemoveUser(user.id)}
                      className="text-sm"
                    >
                      Undo Remove
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => removeUser(user.id)}
                      color="red"
                      className="text-sm"
                      disabled={user.id === selectedPrimaryContactId}
                    >
                      <TrashIcon className="h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Fieldset>

        {/* Add New Users */}
        <Fieldset>
          <Heading level={2}>Add New Users</Heading>
          <Text className="mt-1">Add additional users to this station.</Text>
          
          <div className="mt-6 space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border border-zinc-200 rounded-lg bg-zinc-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-zinc-900">New User {index + 1}</h4>
                  <Button
                    type="button"
                    onClick={() => remove(index)}
                    color="red"
                    className="text-sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
                
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <Label htmlFor={`newUsers.${index}.firstName`}>First Name *</Label>
                      <Input
                        id={`newUsers.${index}.firstName`}
                        {...register(`newUsers.${index}.firstName`)}
                        invalid={!!errors.newUsers?.[index]?.firstName}
                      />
                      {errors.newUsers?.[index]?.firstName && (
                        <ErrorMessage>{errors.newUsers[index]?.firstName?.message}</ErrorMessage>
                      )}
                    </Field>

                    <Field>
                      <Label htmlFor={`newUsers.${index}.lastName`}>Last Name *</Label>
                      <Input
                        id={`newUsers.${index}.lastName`}
                        {...register(`newUsers.${index}.lastName`)}
                        invalid={!!errors.newUsers?.[index]?.lastName}
                      />
                      {errors.newUsers?.[index]?.lastName && (
                        <ErrorMessage>{errors.newUsers[index]?.lastName?.message}</ErrorMessage>
                      )}
                    </Field>

                    <Field>
                      <Label htmlFor={`newUsers.${index}.email`}>Email *</Label>
                      <Input
                        id={`newUsers.${index}.email`}
                        type="email"
                        {...register(`newUsers.${index}.email`)}
                        invalid={!!errors.newUsers?.[index]?.email}
                      />
                      {errors.newUsers?.[index]?.email && (
                        <ErrorMessage>{errors.newUsers[index]?.email?.message}</ErrorMessage>
                      )}
                    </Field>

                    <Field>
                      <Label htmlFor={`newUsers.${index}.mobileNumber`}>Mobile Number</Label>
                      <Input
                        id={`newUsers.${index}.mobileNumber`}
                        type="tel"
                        {...register(`newUsers.${index}.mobileNumber`)}
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </div>
            ))}
            
            <Button
              type="button"
              onClick={addNewUser}
              className="w-full"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add New User
            </Button>

            {fields.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-zinc-900">Account Setup</strong>
                    <p className="text-sm mt-1 text-zinc-700">
                      Each new user will receive a magic link email to set up their account and create a password. No need to enter a password here.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Fieldset>

        {/* Form Actions */}
        <Divider />
        
        <div className="flex items-center justify-between">
          <Button
            type="button"
            onClick={() => router.push(`/admin/stations/${station.id}`)}
            plain
          >
            Cancel
          </Button>

          <Button
            type="submit"
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating Station...' : 'Update Station'}
          </Button>
        </div>
      </form>
    </div>
  );
} 