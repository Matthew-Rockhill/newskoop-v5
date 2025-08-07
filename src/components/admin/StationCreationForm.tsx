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
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Divider } from '@/components/ui/divider';
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

// Form validation schema
const stationSchema = z.object({
  // Basic Information
  name: z.string().min(1, 'Station name is required'),
  province: z.enum(provinces, { required_error: 'Province is required' }),
  contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  contactNumber: z.string().optional(),
  
  // Content Access
  hasContentAccess: z.boolean(),
  
  // Content Filtering
  allowedLanguages: z.array(z.string()).min(1, 'At least one language must be selected'),
  allowedReligions: z.array(z.string()).min(1, 'At least one religion must be selected'),
  blockedCategories: z.array(z.string()),
  
  // Primary Contact
  primaryContact: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    mobileNumber: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),
  
  // Additional Users
  additionalUsers: z.array(z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    mobileNumber: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }))
});

type StationFormData = z.infer<typeof stationSchema>;

// Helper function to format province names
const formatProvince = (province: string) => {
  return province
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export default function StationCreationForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Array<{id: string, name: string, level: number}>>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

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
    trigger,
    setValue
  } = useForm<StationFormData>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      province: 'GAUTENG',
      hasContentAccess: true,
      allowedLanguages: ['English', 'Afrikaans', 'Xhosa'],
      allowedReligions: ['Christian', 'Muslim', 'Neutral'],
      blockedCategories: [],
      additionalUsers: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "additionalUsers"
  });

  const hasContentAccess = watch('hasContentAccess');

  const validateAndProceed = async () => {
    switch (currentStep) {
      case 1:
        const step1Valid = await trigger(['name', 'province', 'contactEmail', 'contactNumber']);
        if (step1Valid) setCurrentStep(currentStep + 1);
        break;
      case 2:
        // Content filtering step - validate that at least one language and religion is selected
        const step2Valid = await trigger(['allowedLanguages', 'allowedReligions']);
        if (step2Valid) setCurrentStep(currentStep + 1);
        break;
      case 3:
        const step3Valid = await trigger(['primaryContact.firstName', 'primaryContact.lastName', 'primaryContact.email', 'primaryContact.mobileNumber', 'primaryContact.password', 'primaryContact.confirmPassword']);
        if (step3Valid) setCurrentStep(currentStep + 1);
        break;
    }
  };

  const onSubmit: SubmitHandler<StationFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create station');

      toast.success('Station created successfully!');
      router.push('/admin/stations');
    } catch (error) {
      toast.error('Failed to create station');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAdditionalUser = () => {
    append({
      firstName: '',
      lastName: '',
      email: '',
      mobileNumber: '',
      password: '',
    });
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Progress Steps */}
      <nav className="mb-8">
        <ol className="flex items-center">
          <li className={`flex items-center ${currentStep >= 1 ? 'text-kelly-green' : 'text-gray-500'}`}>
            <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
              currentStep >= 1 ? 'border-kelly-green bg-kelly-green text-white' : 'border-gray-300'
            }`}>
              1
            </span>
            <span className="ml-2 text-sm font-medium">Station Details</span>
          </li>
          <li className="mx-2 flex-1 sm:mx-4">
            <div className={`h-0.5 ${currentStep >= 2 ? 'bg-kelly-green' : 'bg-gray-300'}`} />
          </li>
          <li className={`flex items-center ${currentStep >= 2 ? 'text-kelly-green' : 'text-gray-500'}`}>
            <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
              currentStep >= 2 ? 'border-kelly-green bg-kelly-green text-white' : 'border-gray-300'
            }`}>
              2
            </span>
            <span className="ml-2 text-sm font-medium">Content Filtering</span>
          </li>
          <li className="mx-2 flex-1 sm:mx-4">
            <div className={`h-0.5 ${currentStep >= 3 ? 'bg-kelly-green' : 'bg-gray-300'}`} />
          </li>
          <li className={`flex items-center ${currentStep >= 3 ? 'text-kelly-green' : 'text-gray-500'}`}>
            <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
              currentStep >= 3 ? 'border-kelly-green bg-kelly-green text-white' : 'border-gray-300'
            }`}>
              3
            </span>
            <span className="ml-2 text-sm font-medium">Primary Contact</span>
          </li>
          <li className="mx-2 flex-1 sm:mx-4">
            <div className={`h-0.5 ${currentStep >= 4 ? 'bg-kelly-green' : 'bg-gray-300'}`} />
          </li>
          <li className={`flex items-center ${currentStep >= 4 ? 'text-kelly-green' : 'text-gray-500'}`}>
            <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
              currentStep >= 4 ? 'border-kelly-green bg-kelly-green text-white' : 'border-gray-300'
            }`}>
              4
            </span>
            <span className="ml-2 text-sm font-medium">Additional Users</span>
          </li>
        </ol>
      </nav>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Station Details */}
        {currentStep === 1 && (
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
        )}

        {/* Step 2: Content Filtering */}
        {currentStep === 2 && (
          <Fieldset>
            <Heading level={2}>Content Filtering</Heading>
            <Text className="mt-1">Configure which content this station can access.</Text>
            
            <FieldGroup className="mt-6">
              <CheckboxField>
                <Checkbox
                  id="hasContentAccess"
                  checked={hasContentAccess}
                  onChange={(checked) => setValue('hasContentAccess', checked)}
                />
                <Label htmlFor="hasContentAccess">
                  Enable Content Access
                  <Description>
                    Allow this station to access content from the newsroom.
                  </Description>
                </Label>
              </CheckboxField>

              {hasContentAccess && (
                <>
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
                          <Label htmlFor={`language-${language}`}>{language}</Label>
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
                          <Label htmlFor={`religion-${religion}`}>
                            {religion}
                            {religion === 'Neutral' && <span className="text-sm text-gray-500 ml-1">(All content)</span>}
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
                      <div className="text-sm text-gray-500">Loading categories...</div>
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
                              <Label htmlFor={`category-${category.id}`}>{category.name}</Label>
                            </CheckboxField>
                          ))}
                      </div>
                    )}
                  </Field>
                </>
              )}
            </FieldGroup>
          </Fieldset>
        )}

        {/* Step 3: Primary Contact */}
        {currentStep === 3 && (
          <Fieldset>
            <Heading level={2}>Primary Contact</Heading>
            <Text className="mt-1">This person will be the main point of contact for the station.</Text>
            
            <FieldGroup className="mt-6">
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <Field>
                  <Label htmlFor="primaryContact.firstName">First Name *</Label>
                  <Input
                    id="primaryContact.firstName"
                    {...register('primaryContact.firstName')}
                    invalid={!!errors.primaryContact?.firstName}
                  />
                  {errors.primaryContact?.firstName && (
                    <ErrorMessage>{errors.primaryContact.firstName.message}</ErrorMessage>
                  )}
                </Field>

                <Field>
                  <Label htmlFor="primaryContact.lastName">Last Name *</Label>
                  <Input
                    id="primaryContact.lastName"
                    {...register('primaryContact.lastName')}
                    invalid={!!errors.primaryContact?.lastName}
                  />
                  {errors.primaryContact?.lastName && (
                    <ErrorMessage>{errors.primaryContact.lastName.message}</ErrorMessage>
                  )}
                </Field>
              </div>

              <Field>
                <Label htmlFor="primaryContact.email">Email Address *</Label>
                <Input
                  id="primaryContact.email"
                  type="email"
                  {...register('primaryContact.email')}
                  invalid={!!errors.primaryContact?.email}
                />
                {errors.primaryContact?.email && (
                  <ErrorMessage>{errors.primaryContact.email.message}</ErrorMessage>
                )}
              </Field>

              <Field>
                <Label htmlFor="primaryContact.mobileNumber">Mobile Number</Label>
                <Input
                  id="primaryContact.mobileNumber"
                  type="tel"
                  {...register('primaryContact.mobileNumber')}
                />
              </Field>

              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <Field>
                  <Label htmlFor="primaryContact.password">Password *</Label>
                  <Input
                    id="primaryContact.password"
                    type="password"
                    {...register('primaryContact.password')}
                    invalid={!!errors.primaryContact?.password}
                  />
                  {errors.primaryContact?.password && (
                    <ErrorMessage>{errors.primaryContact.password.message}</ErrorMessage>
                  )}
                </Field>

                <Field>
                  <Label htmlFor="primaryContact.confirmPassword">Confirm Password *</Label>
                  <Input
                    id="primaryContact.confirmPassword"
                    type="password"
                    {...register('primaryContact.confirmPassword')}
                    invalid={!!errors.primaryContact?.confirmPassword}
                  />
                  {errors.primaryContact?.confirmPassword && (
                    <ErrorMessage>{errors.primaryContact.confirmPassword.message}</ErrorMessage>
                  )}
                </Field>
              </div>
            </FieldGroup>
          </Fieldset>
        )}

        {/* Step 4: Additional Users */}
        {currentStep === 4 && (
          <Fieldset>
            <div className="flex items-center justify-between">
              <div>
                <Heading level={2}>Additional Users</Heading>
                <Text className="mt-1">Add other users who will have access to this station.</Text>
              </div>
              <Button
                type="button"
                onClick={addAdditionalUser}
                outline
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>

            <div className="mt-6 space-y-6">
              {fields.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                  <Text>No additional users added yet.</Text>
                </div>
              ) : (
                fields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border border-gray-200 p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <Subheading>User {index + 1}</Subheading>
                      <Button
                        type="button"
                        onClick={() => remove(index)}
                        plain
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>

                    <FieldGroup>
                      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                        <Field>
                          <Label htmlFor={`additionalUsers.${index}.firstName`}>First Name *</Label>
                          <Input
                            id={`additionalUsers.${index}.firstName`}
                            {...register(`additionalUsers.${index}.firstName`)}
                            invalid={!!errors.additionalUsers?.[index]?.firstName}
                          />
                          {errors.additionalUsers?.[index]?.firstName && (
                            <ErrorMessage>{errors.additionalUsers[index]?.firstName?.message}</ErrorMessage>
                          )}
                        </Field>

                        <Field>
                          <Label htmlFor={`additionalUsers.${index}.lastName`}>Last Name *</Label>
                          <Input
                            id={`additionalUsers.${index}.lastName`}
                            {...register(`additionalUsers.${index}.lastName`)}
                            invalid={!!errors.additionalUsers?.[index]?.lastName}
                          />
                          {errors.additionalUsers?.[index]?.lastName && (
                            <ErrorMessage>{errors.additionalUsers[index]?.lastName?.message}</ErrorMessage>
                          )}
                        </Field>
                      </div>

                      <Field>
                        <Label htmlFor={`additionalUsers.${index}.email`}>Email Address *</Label>
                        <Input
                          id={`additionalUsers.${index}.email`}
                          type="email"
                          {...register(`additionalUsers.${index}.email`)}
                          invalid={!!errors.additionalUsers?.[index]?.email}
                        />
                        {errors.additionalUsers?.[index]?.email && (
                          <ErrorMessage>{errors.additionalUsers[index]?.email?.message}</ErrorMessage>
                        )}
                      </Field>

                      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                        <Field>
                          <Label htmlFor={`additionalUsers.${index}.mobileNumber`}>Mobile Number</Label>
                          <Input
                            id={`additionalUsers.${index}.mobileNumber`}
                            type="tel"
                            {...register(`additionalUsers.${index}.mobileNumber`)}
                          />
                        </Field>

                        <Field>
                          <Label htmlFor={`additionalUsers.${index}.password`}>Password *</Label>
                          <Input
                            id={`additionalUsers.${index}.password`}
                            type="password"
                            {...register(`additionalUsers.${index}.password`)}
                            invalid={!!errors.additionalUsers?.[index]?.password}
                          />
                          {errors.additionalUsers?.[index]?.password && (
                            <ErrorMessage>{errors.additionalUsers[index]?.password?.message}</ErrorMessage>
                          )}
                        </Field>
                      </div>
                    </FieldGroup>
                  </div>
                ))
              )}
            </div>
            
            {fields.length > 0 && (
              <div className="mt-6 p-4 bg-white-smoke border border-kelly-green rounded-lg">
                <div className="flex items-start space-x-3">
                  <InfoIcon className="h-5 w-5 text-kelly-green mt-0.5" />
                  <div>
                    <strong className="text-black-custom">User Access</strong>
                    <p className="text-sm mt-1 text-black-custom">
                      Each user will receive an email with instructions to set up their password.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Fieldset>
        )}

        {/* Form Actions */}
        <Divider className="my-8" />
        
        <div className="flex items-center justify-between">
          <Button
            type="button"
            onClick={() => router.push('/admin/stations')}
            plain
          >
            Cancel
          </Button>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                outline
              >
                Previous
              </Button>
            )}
            
            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={validateAndProceed}
                color="primary"
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Station...' : 'Create Station'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}