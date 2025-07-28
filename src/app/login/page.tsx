'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button'
import { Link } from '@/components/ui/link'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import Logo from '@/components/shared/Logo'
import toast from 'react-hot-toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Successfully signed in!');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error('An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100vh] flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#f5f5f5]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block">
          <Logo className="mx-auto h-12 w-auto" variant="full" />
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-[#272727]">
          Sign in to your account
        </h2>
      </div>
      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white px-6 py-12 shadow-sm sm:rounded-lg sm:px-12">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#272727]">
                Email address
              </label>
              <div className="mt-2">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#272727]">
                Password
              </label>
              <div className="mt-2">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <Checkbox
                  id="remember-me"
                  name="remember-me"
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="block text-sm text-[#272727]">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link href="/password-reset" className="font-semibold text-[#76BD43] hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>
            <div>
              <Button type="submit" color="primary" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>
        </div>
        <p className="mt-10 text-center text-sm text-gray-500">
          Not a member?{' '}
          <Link href="/register" className="font-semibold text-[#76BD43] hover:underline">
            Register for Newskoop
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
} 