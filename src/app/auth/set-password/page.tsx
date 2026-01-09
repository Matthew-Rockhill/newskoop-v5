'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/ui/link';
import { Input } from '@/components/ui/input';
import Logo from '@/components/shared/Logo';
import { Field, FieldGroup, Fieldset, Label, ErrorMessage } from '@/components/ui/fieldset';
import toast from 'react-hot-toast';

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing token');
      router.push('/login');
    }
  }, [token, router]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set password');
      }

      toast.success('Password set successfully! Please log in.');
      router.push('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100vh] flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#f5f5f5]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block">
          <Logo className="mx-auto h-12 w-auto" variant="full" />
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-[#272727]">
          Set Your Password
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-600">
          Create a secure password for your account
        </p>
      </div>
      
      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white px-6 py-12 shadow-sm sm:rounded-lg sm:px-12">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Fieldset>
              <FieldGroup>
                <Field>
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    invalid={!!errors.password}
                  />
                  {errors.password && (
                    <ErrorMessage>{errors.password}</ErrorMessage>
                  )}
                </Field>

                <Field>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    invalid={!!errors.confirmPassword}
                  />
                  {errors.confirmPassword && (
                    <ErrorMessage>{errors.confirmPassword}</ErrorMessage>
                  )}
                </Field>
              </FieldGroup>
            </Fieldset>

            <Button 
              type="submit" 
              color="primary" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Setting Password...' : 'Set Password'}
            </Button>
          </form>
        </div>
        
        <p className="mt-10 text-center text-sm text-zinc-500">
          Need help?{' '}
          <Link href="/login" className="font-semibold text-kelly-green hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SetPasswordContent />
    </Suspense>
  );
}