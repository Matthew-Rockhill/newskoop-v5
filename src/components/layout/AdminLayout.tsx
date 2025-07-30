'use client'

import { useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import {
  Bars3Icon,
  UsersIcon,
  RadioIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  XMarkIcon,
  DocumentTextIcon,
  FolderIcon,
  TagIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon,
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

interface NavigationSection {
  name: string
  items: NavigationItem[]
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  // Role-based navigation with sections
  const getNavigation = (): (NavigationItem | NavigationSection)[] => {
    const navigation: (NavigationItem | NavigationSection)[] = []

    // Dashboard - context-aware based on current path
    const dashboardHref = pathname.startsWith('/newsroom') && session?.user?.staffRole && 
      ['EDITOR', 'SUB_EDITOR', 'JOURNALIST', 'INTERN'].includes(session.user.staffRole) 
      ? '/newsroom' 
      : '/admin';
    navigation.push({ name: 'Dashboard', href: dashboardHref, icon: HomeIcon })

    // Newsroom section - only for editorial staff (NOT SUPERADMIN)
    if (session?.user?.userType === 'STAFF' && 
        session?.user?.staffRole && 
        ['INTERN', 'JOURNALIST', 'SUB_EDITOR', 'EDITOR'].includes(session.user.staffRole)) {
      const newsroomItems: NavigationItem[] = []
      
      // All editorial staff can see stories
      newsroomItems.push({ name: 'Stories', href: '/newsroom/stories', icon: DocumentTextIcon })
      
      // Categories and Tags - SUB_EDITOR and above
      if (session.user.staffRole && ['EDITOR', 'SUB_EDITOR'].includes(session.user.staffRole)) {
        newsroomItems.push({ name: 'Categories', href: '/newsroom/categories', icon: FolderIcon })
        newsroomItems.push({ name: 'Tags', href: '/newsroom/tags', icon: TagIcon })
      }

      if (newsroomItems.length > 0) {
        navigation.push({
          name: 'Newsroom',
          items: newsroomItems
        })
      }
    }

    // System Administration section - ADMIN and SUPERADMIN only
    if (session?.user?.staffRole && ['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole)) {
      const adminItems: NavigationItem[] = [
        { name: 'Radio Stations', href: '/admin/stations', icon: RadioIcon },
        { name: 'Users', href: '/admin/users', icon: UsersIcon },
      ]

      // Reports - SUPERADMIN only for now
      // TODO: Implement reports page
      // if (session.user.staffRole === 'SUPERADMIN') {
      //   adminItems.push({ name: 'Reports', href: '/admin/reports', icon: ChartBarIcon })
      // }

      navigation.push({
        name: 'System Administration',
        items: adminItems
      })
    }

    return navigation
  }

  const navigation = getNavigation()

  const renderNavigationItem = (item: NavigationItem, isInSection: boolean = false) => {
    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
    const content = (
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
    )

    // If it's in a section, don't wrap in li (the section will handle that)
    // If it's standalone, wrap in li
    return isInSection ? content : <li key={item.name}>{content}</li>
  }

  const renderNavigationSection = (section: NavigationSection) => (
    <li key={section.name}>
      <div className="text-xs font-semibold leading-6 text-gray-400 uppercase tracking-wider mb-2">
        {section.name}
      </div>
      <ul role="list" className="-mx-2 space-y-1">
        {section.items.map((item) => (
          <li key={item.name}>
            {renderNavigationItem(item, true)}
          </li>
        ))}
      </ul>
    </li>
  )

  const SidebarContent = () => (
    <>
      <div className="flex h-16 shrink-0 items-center">
        <Logo className="h-8 w-auto" variant="full" />
      </div>
      <nav className="flex flex-1 flex-col justify-between">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          {navigation.map((item) => {
            if ('items' in item) {
              return renderNavigationSection(item)
            } else {
              // Wrap standalone items in the same structure as sections
              return (
                <li key={item.name}>
                  <ul role="list" className="-mx-2 space-y-1">
                    {renderNavigationItem(item, false)}
                  </ul>
                </li>
              )
            }
          })}
        </ul>

        <div className="-mx-6 mt-auto">
          <div className="flex flex-col gap-y-4">
            {/* Settings - only for ADMIN and SUPERADMIN */}
            {/* TODO: Implement settings page */}
            {/* {session?.user?.staffRole && ['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole) && (
              <Link
                href="/admin/settings"
                className={classNames(
                  pathname === '/admin/settings'
                    ? 'bg-gray-50 text-[#76BD43]'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-[#76BD43]',
                  'group flex items-center gap-x-3 px-6 py-3 text-sm font-semibold leading-6'
                )}
              >
                <Cog6ToothIcon
                  className={classNames(
                    pathname === '/admin/settings' ? 'text-[#76BD43]' : 'text-gray-400 group-hover:text-[#76BD43]',
                    'h-6 w-6 shrink-0'
                  )}
                  aria-hidden="true"
                />
                Settings
              </Link>
            )} */}

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
                      {session.user.userType === 'STAFF' ? session.user.staffRole : 'Radio Station User'}
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
        </div>
      </nav>
    </>
  )

  // Get current page name for mobile header
  const getCurrentPageName = () => {
    for (const item of navigation) {
      if ('items' in item) {
        const found = item.items.find(subItem => 
          pathname === subItem.href || (subItem.href !== '/admin' && pathname.startsWith(subItem.href))
        )
        if (found) return found.name
      } else {
        if (pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))) {
          return item.name
        }
      }
    }
    return 'Dashboard'
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