'use client';

import { Button } from '@/components/ui/button'
import { Link } from '@/components/ui/link'
import { Input } from '@/components/ui/input'
import Logo from '@/components/shared/Logo'

export default function PasswordResetPage() {
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
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
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
                />
              </div>
            </div>
            <Button type="submit" color="primary" className="w-full">
              Send Reset Link
            </Button>
          </form>
        </div>
        <p className="mt-10 text-center text-sm text-gray-500">
          Remembered your password?{' '}
          <Link href="/login" className="font-semibold text-[#76BD43] hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
} 