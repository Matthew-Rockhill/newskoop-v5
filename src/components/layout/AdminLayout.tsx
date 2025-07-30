'use client'

import { useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import {
  Bars3Icon,
  XMarkIcon,
  UsersIcon,
  RadioIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
} from '@heroicons/react/24/outline'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Logo from '../shared/Logo'
import { useSession, signOut } from 'next-auth/react'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

interface AdminLayoutProps {
  children: React.ReactNode
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  // Clean admin navigation for both ADMIN and SUPERADMIN
  const getNavigation = (): NavigationItem[] => {
    const navigation: NavigationItem[] = []

    // Dashboard - always admin dashboard
    navigation.push({ name: 'Dashboard', href: '/admin', icon: HomeIcon })

    // Core admin functions
    navigation.push({ name: 'Users', href: '/admin/users', icon: UsersIcon })
    navigation.push({ name: 'Radio Stations', href: '/admin/stations', icon: RadioIcon })

    return navigation
  }

  const navigation = getNavigation()

  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
    
    return (
      <li key={item.name}>
        <Link
          href={item.href}
          className={classNames(
            isActive
              ? 'bg-gray-50 text-[#76BD43]'
              : 'text-gray-700 hover:bg-gray-50 hover:text-[#76BD43]',
            'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
          )}
        >
          <item.icon
            className={classNames(
              isActive ? 'text-[#76BD43]' : 'text-gray-400 group-hover:text-[#76BD43]',
              'h-6 w-6 shrink-0'
            )}
            aria-hidden="true"
          />
          {item.name}
        </Link>
      </li>
    )
  }

  const SidebarContent = () => (
    <>
      <div className="flex h-16 shrink-0 items-center">
        <Logo className="h-8 w-auto" variant="full" />
      </div>
      <nav className="flex flex-1 flex-col justify-between">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <div className="text-xs font-semibold leading-6 text-gray-400 uppercase tracking-wider mb-2">
              System Administration
            </div>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => renderNavigationItem(item))}
            </ul>
          </li>
        </ul>

        <div className="-mx-6 mt-auto">
          {session?.user && (
            <div className="border-t border-gray-200 px-6 py-3">
              <div className="flex items-center gap-x-4 mb-3">
                <Avatar
                  className="h-8 w-8"
                  name={`${session.user.firstName} ${session.user.lastName}`}
                />
                <div className="min-w-0 flex-auto">
                  <p className="text-sm font-semibold text-gray-900">
                    {`${session.user.firstName} ${session.user.lastName}`}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {session.user.staffRole === 'SUPERADMIN' ? 'Super Administrator' : 'Administrator'}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => signOut({ callbackUrl: '/login' })}
                color="white"
                className="w-full justify-start text-sm"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </nav>
    </>
  )

  // Get current page name for mobile header
  const getCurrentPageName = () => {
    const found = navigation.find(item => 
      pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
    )
    return found?.name || 'Dashboard'
  }

  return (
    <>
      <div>
        <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
          <DialogBackdrop
            className="fixed inset-0 bg-gray-900/80"
          />

          <div className="fixed inset-0 flex">
            <DialogPanel
              className="relative mr-16 flex w-full max-w-xs flex-1"
            >
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5">
                <button type="button" onClick={() => setSidebarOpen(false)} className="-m-2.5 p-2.5">
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>

              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
                <SidebarContent />
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
            <SidebarContent />
          </div>
        </div>

        <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
            {getCurrentPageName()}
          </div>
          <div className="flex items-center gap-x-2">
            {session?.user && (
              <Avatar
                className="h-8 w-8"
                name={`${session.user.firstName} ${session.user.lastName}`}
              />
            )}
            <Button
              onClick={() => signOut({ callbackUrl: '/login' })}
              color="white"
              className="lg:hidden"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <main className="py-10 lg:pl-72">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </>
  )
} 