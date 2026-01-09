'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button'
import { Link } from '@/components/ui/link'
import { Input } from '@/components/ui/input'
import Logo from '@/components/shared/Logo'
import toast from 'react-hot-toast';

export default function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        toast.success('If an account exists, you will receive a password reset email');
        setEmail('');
      } else {
        throw new Error('Failed to send reset email');
      }
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error('Failed to send reset email. Please try again.');
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
          Reset your password
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" color="primary" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        </div>
        <p className="mt-10 text-center text-sm text-zinc-500">
          Remembered your password?{' '}
          <Link href="/login" className="font-semibold text-kelly-green hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
} 