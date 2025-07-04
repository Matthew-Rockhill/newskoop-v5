import { Button } from '@/components/ui/button'
import { Link } from '@/components/ui/link'
import Logo from '@/components/shared/Logo'

export default function NotFound() {
  return (
    <div className="flex min-h-[100vh] flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#f5f5f5]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <Link href="/" className="inline-block">
            <Logo className="mx-auto h-12 w-auto" variant="full" />
          </Link>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-[#272727]">
          Page not found
        </h2>
      </div>
      
      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white px-6 py-12 shadow-sm sm:rounded-lg sm:px-12 text-center">
          <div className="space-y-6">
            <div>
              <p className="text-6xl font-bold text-[#76BD43] mb-4">404</p>
              <h1 className="text-3xl font-semibold text-[#272727] mb-4">
                Oops! Page not found
        </h1>
              <p className="text-gray-500 mb-8">
                The page you're looking for doesn't exist or has been moved.
        </p>
            </div>
            
            <div className="space-y-4">
              <Button href="/" color="primary" className="w-full">
            Go back home
          </Button>
              <Button href="/admin" color="secondary" className="w-full">
                Go to Admin Dashboard
              </Button>
            </div>
          </div>
        </div>
        
        <p className="mt-10 text-center text-sm text-gray-500">
          Need help?{' '}
          <Link href="/contact" className="font-semibold text-[#76BD43] hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  )
} 