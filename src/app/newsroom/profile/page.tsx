'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Container } from '@/components/ui/container';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';
import { 
  UserIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  CameraIcon,
  ArrowLeftIcon,
  KeyIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  mobileNumber: z.string().optional(),
  defaultLanguagePreference: z.string().optional(),
});

const passwordResetSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

export default function NewsroomProfilePage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user profile data
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['staff-profile'],
    queryFn: async () => {
      const response = await fetch('/api/staff/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!session,
  });

  const user = profileData?.user;

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      mobileNumber: user?.mobileNumber || '',
      defaultLanguagePreference: user?.defaultLanguagePreference || 'English',
    },
  });

  // Password reset form
  const passwordForm = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await fetch('/api/staff/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-profile'] });
      alert('Profile updated successfully!');
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to update profile');
    },
  });

  // Password reset mutation
  const passwordResetMutation = useMutation({
    mutationFn: async (data: PasswordResetFormData) => {
      const response = await fetch('/api/radio/profile/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to reset password');
      return response.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      setShowPasswordReset(false);
      alert('Password updated successfully!');
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to update password');
    },
  });

  // Profile picture upload mutation
  const uploadProfilePictureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/radio/profile/upload-picture', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload picture');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-profile'] });
      alert('Profile picture updated successfully!');
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to upload picture');
    },
  });

  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('File must be an image');
        return;
      }
      uploadProfilePictureMutation.mutate(file);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Container className="py-8">
          <Card className="p-8 text-center bg-white animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </Card>
        </Container>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'preferences', label: 'Preferences', icon: Cog6ToothIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
  ];

  const getRoleDisplayName = (staffRole: string) => {
    switch (staffRole) {
      case 'SUPERADMIN':
        return 'Super Administrator';
      case 'EDITOR':
        return 'Editor';
      case 'SUB_EDITOR':
        return 'Sub Editor';
      case 'JOURNALIST':
        return 'Journalist';
      case 'INTERN':
        return 'Intern';
      default:
        return staffRole;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Container className="py-8">
        {/* Back Navigation */}
        <div className="mb-8">
          <Button
            color="white"
            onClick={() => window.location.href = '/newsroom'}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Newsroom Dashboard
          </Button>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <Heading level={1} className="text-3xl font-bold text-gray-900 mb-2">
            Profile & Settings
          </Heading>
          <Text className="text-gray-600">
            Manage your personal information, preferences, and account security.
          </Text>
        </div>

        {/* Tab Navigation */}
        <Card className="mb-8 bg-white shadow-lg border-0">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-[#76BD43] text-[#76BD43]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-8">
                {/* Profile Picture Section */}
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <Avatar
                      className="h-20 w-20"
                      name={`${user?.firstName} ${user?.lastName}`}
                      src={user?.profilePictureUrl}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-2 bg-[#76BD43] text-white rounded-full hover:bg-[#76BD43]/90 transition-colors"
                    >
                      <CameraIcon className="h-4 w-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <Heading level={3} className="text-lg font-semibold text-gray-900 mb-1">
                      Profile Picture
                    </Heading>
                    <Text className="text-gray-600 mb-2">
                      Upload a photo to personalize your profile. Maximum file size: 2MB.
                    </Text>
                    <Button
                      color="white"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadProfilePictureMutation.isPending}
                    >
                      {uploadProfilePictureMutation.isPending ? 'Uploading...' : 'Change Picture'}
                    </Button>
                  </div>
                </div>

                {/* Personal Information Form */}
                <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <Input
                        {...profileForm.register('firstName')}
                        error={profileForm.formState.errors.firstName?.message}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <Input
                        {...profileForm.register('lastName')}
                        error={profileForm.formState.errors.lastName?.message}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile Number
                      </label>
                      <Input
                        {...profileForm.register('mobileNumber')}
                        placeholder="Optional"
                        error={profileForm.formState.errors.mobileNumber?.message}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button
                      type="submit"
                      className="bg-[#76BD43] hover:bg-[#76BD43]/90 text-white"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-8">
                <div>
                  <Heading level={3} className="text-lg font-semibold text-gray-900 mb-4">
                    Editorial Preferences
                  </Heading>
                  
                  <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))}>
                    <div className="max-w-md">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Language
                      </label>
                      <Text className="text-gray-600 text-sm mb-3">
                        Choose your preferred language for editorial interface and content filtering.
                      </Text>
                      <Select {...profileForm.register('defaultLanguagePreference')}>
                        <option value="English">English</option>
                        <option value="Afrikaans">Afrikaans</option>
                        <option value="Xhosa">Xhosa</option>
                      </Select>
                    </div>

                    <div className="flex justify-end mt-6">
                      <Button
                        type="submit"
                        className="bg-[#76BD43] hover:bg-[#76BD43]/90 text-white"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Preferences'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                <div>
                  <Heading level={3} className="text-lg font-semibold text-gray-900 mb-4">
                    Password & Security
                  </Heading>
                  
                  {!showPasswordReset ? (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        <KeyIcon className="h-8 w-8 text-gray-400 mt-1" />
                        <div className="flex-1">
                          <Heading level={4} className="text-lg font-medium text-gray-900 mb-2">
                            Change Password
                          </Heading>
                          <Text className="text-gray-600 mb-4">
                            Update your password to keep your account secure. Use a strong password with at least 8 characters.
                          </Text>
                          <Button
                            className="bg-[#76BD43] hover:bg-[#76BD43]/90 text-white"
                            onClick={() => setShowPasswordReset(true)}
                          >
                            Change Password
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Card className="border border-gray-200">
                      <div className="p-6">
                        <form onSubmit={passwordForm.handleSubmit((data) => passwordResetMutation.mutate(data))}>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Current Password *
                              </label>
                              <Input
                                type="password"
                                {...passwordForm.register('currentPassword')}
                                error={passwordForm.formState.errors.currentPassword?.message}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                New Password *
                              </label>
                              <Input
                                type="password"
                                {...passwordForm.register('newPassword')}
                                error={passwordForm.formState.errors.newPassword?.message}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm New Password *
                              </label>
                              <Input
                                type="password"
                                {...passwordForm.register('confirmPassword')}
                                error={passwordForm.formState.errors.confirmPassword?.message}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 mt-6">
                            <Button
                              type="button"
                              color="white"
                              onClick={() => {
                                setShowPasswordReset(false);
                                passwordForm.reset();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              className="bg-[#76BD43] hover:bg-[#76BD43]/90 text-white"
                              disabled={passwordResetMutation.isPending}
                            >
                              {passwordResetMutation.isPending ? 'Updating...' : 'Update Password'}
                            </Button>
                          </div>
                        </form>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Account Info */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <CheckCircleIcon className="h-8 w-8 text-blue-500 mt-1" />
                    <div>
                      <Heading level={4} className="text-lg font-medium text-gray-900 mb-2">
                        Account Information
                      </Heading>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Text className="text-gray-600">Email:</Text>
                          <Text className="font-medium">{user?.email}</Text>
                        </div>
                        <div className="flex items-center gap-2">
                          <Text className="text-gray-600">Role:</Text>
                          <Text className="font-medium">
                            {getRoleDisplayName(user?.staffRole)}
                          </Text>
                        </div>
                        <div className="flex items-center gap-2">
                          <Text className="text-gray-600">Account Status:</Text>
                          <Badge color={user?.isActive ? 'green' : 'red'}>
                            {user?.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </Container>
    </div>
  );
}