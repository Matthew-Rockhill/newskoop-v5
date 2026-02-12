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
  MegaphoneIcon,
  SpeakerWaveIcon,
  ChevronDownIcon,
  ArrowLeftIcon,
  UserIcon,
  NewspaperIcon,
  ChartBarIcon,
  ServerIcon,
} from '@heroicons/react/24/outline'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Logo from '../shared/Logo'
import { useSession, signOut } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
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
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  // Fetch user profile to get profile picture
  const { data: profileData } = useQuery({
    queryKey: ['staff-profile'],
    queryFn: async () => {
      const response = await fetch('/api/staff/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!session,
  });

  // Check if user is SUPERADMIN
  const isSuperAdmin = session?.user?.staffRole === 'SUPERADMIN'

  // Clean admin navigation for both ADMIN and SUPERADMIN
  const getNavigation = (): NavigationItem[] => {
    const navigation: NavigationItem[] = []

    // System Status - SUPERADMIN only
    if (isSuperAdmin) {
      navigation.push({ name: 'System Status', href: '/admin/super', icon: ServerIcon })
    }

    // Dashboard - always admin dashboard
    navigation.push({ name: 'Dashboard', href: '/admin', icon: HomeIcon })

    // Core admin functions
    navigation.push({ name: 'Users', href: '/admin/users', icon: UsersIcon })
    navigation.push({ name: 'Radio Stations', href: '/admin/stations', icon: RadioIcon })
    navigation.push({ name: 'Announcements', href: '/admin/announcements', icon: MegaphoneIcon })
    navigation.push({ name: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon })

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
              ? 'bg-zinc-50 text-kelly-green'
              : 'text-zinc-700 hover:bg-zinc-50 hover:text-kelly-green',
            'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
          )}
        >
          <item.icon
            className={classNames(
              isActive ? 'text-kelly-green' : 'text-zinc-400 group-hover:text-kelly-green',
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
            <div className="text-xs font-semibold leading-6 text-zinc-400 uppercase tracking-wider mb-2">
              System Administration
            </div>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => renderNavigationItem(item))}
            </ul>
          </li>
          <li>
            <div className="text-xs font-semibold leading-6 text-zinc-400 uppercase tracking-wider mb-2">
              Content Access
            </div>
            <ul role="list" className="-mx-2 space-y-1">
              <li>
                <Link
                  href="/radio"
                  className={classNames(
                    pathname.startsWith('/radio')
                      ? 'bg-zinc-50 text-kelly-green'
                      : 'text-zinc-700 hover:bg-zinc-50 hover:text-kelly-green',
                    'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                  )}
                >
                  <SpeakerWaveIcon
                    className={classNames(
                      pathname.startsWith('/radio') ? 'text-kelly-green' : 'text-zinc-400 group-hover:text-kelly-green',
                      'h-6 w-6 shrink-0'
                    )}
                    aria-hidden="true"
                  />
                  Radio Station Zone
                </Link>
              </li>
            </ul>
          </li>
        </ul>

        <div className="-mx-6 mt-auto">
          {session?.user && (
            <div className="border-t border-zinc-200 px-6 py-3">
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-x-3 p-2 rounded-lg hover:bg-zinc-50 transition-colors w-full"
                >
                  <Avatar
                    className="h-8 w-8"
                    name={`${session.user.firstName} ${session.user.lastName}`}
                    src={profileData?.user?.profilePictureUrl}
                  />
                  <div className="min-w-0 flex-auto text-left">
                    <p className="text-sm font-semibold text-zinc-900">
                      {`${session.user.firstName} ${session.user.lastName}`}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {session.user.staffRole === 'SUPERADMIN' ? 'Super Administrator' : 'Administrator'}
                    </p>
                  </div>
                  <ChevronDownIcon className={`h-4 w-4 text-zinc-500 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown */}
                {isUserDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsUserDropdownOpen(false)}
                    />
                    
                    {/* Dropdown Menu */}
                    <div className="absolute bottom-full left-2 right-2 mb-2 bg-white rounded-lg shadow-lg border border-zinc-200 z-20">
                      <div className="py-2">
                        {/* Cross-Navigation Links */}
                        {/* Newsroom Dashboard - for editorial staff */}
                        {(['SUPERADMIN', 'EDITOR', 'SUB_EDITOR', 'JOURNALIST', 'INTERN'].includes(session.user.staffRole || '')) && (
                          <Link
                            href="/newsroom"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <ArrowLeftIcon className="h-4 w-4" />
                            Newsroom Dashboard
                          </Link>
                        )}
                        
                        {/* Radio Station Zone - all staff */}
                        <Link
                          href="/radio"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                          onClick={() => setIsUserDropdownOpen(false)}
                        >
                          <ArrowLeftIcon className="h-4 w-4" />
                          Radio Station Zone
                        </Link>
                        
                        <div className="border-t border-zinc-100 my-1"></div>
                        
                        {/* Profile & Settings */}
                        <Link
                          href="/admin/profile"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                          onClick={() => setIsUserDropdownOpen(false)}
                        >
                          <UserIcon className="h-4 w-4" />
                          Profile & Settings
                        </Link>
                        
                        <div className="border-t border-zinc-100 my-1"></div>
                        
                        {/* Sign Out */}
                        <button
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            signOut({ callbackUrl: '/login' });
                          }}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                        >
                          <ArrowRightOnRectangleIcon className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
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
            className="fixed inset-0 bg-zinc-900/80"
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
          <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-zinc-200 bg-white px-6">
            <SidebarContent />
          </div>
        </div>

        <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-zinc-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex-1 text-sm font-semibold leading-6 text-zinc-900">
            {getCurrentPageName()}
          </div>
          <div className="flex items-center gap-x-2">
            {session?.user && (
              <Avatar
                className="h-8 w-8"
                name={`${session.user.firstName} ${session.user.lastName}`}
                src={profileData?.user?.profilePictureUrl}
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