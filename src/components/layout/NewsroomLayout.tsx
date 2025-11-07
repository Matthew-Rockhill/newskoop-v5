'use client'

import { useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import {
  Bars3Icon,
  XMarkIcon,
  DocumentTextIcon,
  FolderIcon,
  TagIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon,
  NewspaperIcon,
  MegaphoneIcon,
  SpeakerWaveIcon,
  ChevronDownIcon,
  ArrowLeftIcon,
  UserIcon,
  CogIcon,
  RadioIcon,
  ChartBarIcon,
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

interface NewsroomLayoutProps {
  children: React.ReactNode
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

export function NewsroomLayout({ children }: NewsroomLayoutProps) {
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

  // Newsroom navigation for editorial staff
  const getNavigation = (): NavigationItem[] => {
    const navigation: NavigationItem[] = []

    // Dashboard - always newsroom for editorial staff
    navigation.push({ name: 'Dashboard', href: '/newsroom', icon: HomeIcon })

    // All editorial staff can see stories
    navigation.push({ name: 'Stories', href: '/newsroom/stories', icon: DocumentTextIcon })

    // Shows - SUB_EDITOR and above
    if (session?.user?.staffRole && ['EDITOR', 'SUB_EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole)) {
      navigation.push({ name: 'Shows', href: '/newsroom/shows', icon: SpeakerWaveIcon })
    }

    // Bulletins - SUB_EDITOR and above
    if (session?.user?.staffRole && ['EDITOR', 'SUB_EDITOR'].includes(session.user.staffRole)) {
      navigation.push({ name: 'Bulletins', href: '/newsroom/bulletins', icon: RadioIcon })
    }

    // Editorial Dashboard - SUB_EDITOR and above (EDITOR role)
    if (session?.user?.staffRole && ['EDITOR', 'SUB_EDITOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.staffRole)) {
      navigation.push({ name: 'Editorial Dashboard', href: '/newsroom/editorial-dashboard', icon: ChartBarIcon })
    }
    
    // Categories and Tags - SUB_EDITOR and above
    if (session?.user?.staffRole && ['EDITOR', 'SUB_EDITOR'].includes(session.user.staffRole)) {
      navigation.push({ name: 'Categories', href: '/newsroom/categories', icon: FolderIcon })
      navigation.push({ name: 'Tags', href: '/newsroom/tags', icon: TagIcon })
    }

    // Announcements - EDITOR and above
    if (session?.user?.staffRole && ['SUPERADMIN', 'ADMIN', 'EDITOR'].includes(session.user.staffRole)) {
      navigation.push({ name: 'Announcements', href: '/newsroom/announcements', icon: MegaphoneIcon })
    }

    return navigation
  }

  const navigation = getNavigation()

  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = pathname === item.href || (item.href !== '/newsroom' && pathname.startsWith(item.href))
    
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
              Newsroom
            </div>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => renderNavigationItem(item))}
            </ul>
          </li>
          <li>
            <div className="text-xs font-semibold leading-6 text-gray-400 uppercase tracking-wider mb-2">
              Content Access
            </div>
            <ul role="list" className="-mx-2 space-y-1">
              <li>
                <Link
                  href="/radio"
                  className={classNames(
                    pathname.startsWith('/radio')
                      ? 'bg-gray-50 text-[#76BD43]'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-[#76BD43]',
                    'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                  )}
                >
                  <SpeakerWaveIcon
                    className={classNames(
                      pathname.startsWith('/radio') ? 'text-[#76BD43]' : 'text-gray-400 group-hover:text-[#76BD43]',
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
            <div className="border-t border-gray-200 px-6 py-3">
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors w-full"
                >
                  <Avatar
                    className="h-8 w-8"
                    name={`${session.user.firstName} ${session.user.lastName}`}
                    src={profileData?.user?.profilePictureUrl}
                  />
                  <div className="min-w-0 flex-auto text-left">
                    <p className="text-sm font-semibold text-gray-900">
                      {`${session.user.firstName} ${session.user.lastName}`}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {session.user.staffRole}
                    </p>
                  </div>
                  <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
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
                    <div className="absolute bottom-full left-2 right-2 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                      <div className="py-2">
                        {/* Cross-Navigation Links */}
                        {/* Admin Dashboard - for admin staff */}
                        {(['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole || '')) && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <ArrowLeftIcon className="h-4 w-4" />
                            Admin Dashboard
                          </Link>
                        )}
                        
                        {/* Radio Station Zone - all staff */}
                        <Link
                          href="/radio"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsUserDropdownOpen(false)}
                        >
                          <ArrowLeftIcon className="h-4 w-4" />
                          Radio Station Zone
                        </Link>
                        
                        <div className="border-t border-gray-100 my-1"></div>
                        
                        {/* Profile & Settings */}
                        <Link
                          href="/newsroom/profile"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsUserDropdownOpen(false)}
                        >
                          <UserIcon className="h-4 w-4" />
                          Profile & Settings
                        </Link>
                        
                        <div className="border-t border-gray-100 my-1"></div>
                        
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
      pathname === item.href || (item.href !== '/newsroom' && pathname.startsWith(item.href))
    )
    return found?.name || 'Newsroom'
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