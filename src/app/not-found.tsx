import { Button } from '@/components/ui/button'
import { Link } from '@/components/ui/link'
import Logo from '@/components/shared/Logo'

export default function NotFound() {
  return (
    <main className="grid min-h-[80vh] place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
          <Link href="/" className="inline-block">
            <Logo className="mx-auto h-12 w-auto" variant="full" />
          </Link>
        </div>
        <p className="text-base font-semibold text-[#76BD43]">404</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-[#272727] sm:text-7xl">
          Page not found
        </h1>
        <p className="mt-6 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button href="/" color="primary">
            Go back home
          </Button>
          <Link href="/contact" className="text-sm font-semibold text-[#272727] hover:text-[#76BD43] transition-colors">
            Contact support <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </main>
  )
} 