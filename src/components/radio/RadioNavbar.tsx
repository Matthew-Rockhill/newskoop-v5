'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftIcon,
  CogIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { CategoryMegaMenu } from './CategoryMegaMenu';

interface MenuItem {
  id: string;
  label: string;
  labelAfrikaans: string | null;
  type: 'CATEGORY' | 'CUSTOM_LINK' | 'DIVIDER';
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    nameAfrikaans: string | null;
    slug: string;
  } | null;
  url: string | null;
  openInNewTab: boolean;
  parentId: string | null;
  sortOrder: number;
  isVisible: boolean;
  icon: string | null;
  children?: MenuItem[];
}

export function RadioNavbar() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Fetch user profile to get profile picture
  const { data: profileData } = useQuery({
    queryKey: ['radio-profile'],
    queryFn: async () => {
      const response = await fetch('/api/radio/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!session,
  });

  // Fetch menu items for navigation
  const { data: menuData } = useQuery({
    queryKey: ['radio-menu'],
    queryFn: async () => {
      const response = await fetch('/api/radio/menu');
      if (!response.ok) throw new Error('Failed to fetch menu');
      return response.json();
    },
    enabled: !!session,
  });

  // Fetch announcements
  const { data: announcementsData } = useQuery({
    queryKey: ['radio-announcements'],
    queryFn: async () => {
      const response = await fetch('/api/radio/announcements?perPage=10');
      if (!response.ok) throw new Error('Failed to fetch announcements');
      return response.json();
    },
    enabled: !!session,
  });

  const announcements = announcementsData?.announcements || [];

  // Dismiss announcement mutation
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/radio/announcements/${id}/dismiss`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to dismiss announcement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio-announcements'] });
    },
  });

  const handleDismissAnnouncement = async (id: string) => {
    try {
      await dismissMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error dismissing announcement:', error);
    }
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const menuItems: MenuItem[] = menuData?.menu || [];

  // Get user's language preference for displaying labels
  const userLanguage = profileData?.user?.defaultLanguagePreference || 'English';

  // Helper to get the appropriate label based on user's language preference
  const getMenuLabel = (item: MenuItem) => {
    if (userLanguage === 'Afrikaans' && item.labelAfrikaans) {
      return item.labelAfrikaans;
    }
    return item.label;
  };

  // Helper to get the category name
  const getCategoryName = (category: { name: string; nameAfrikaans: string | null } | null) => {
    if (!category) return '';
    if (userLanguage === 'Afrikaans' && category.nameAfrikaans) {
      return category.nameAfrikaans;
    }
    return category.name;
  };

  // Helper to get the URL for a menu item
  const getMenuUrl = (item: MenuItem): string => {
    if (item.type === 'CUSTOM_LINK' && item.url) {
      return item.url;
    }
    if (item.type === 'CATEGORY' && item.category) {
      return `/radio/${item.category.slug}`;
    }
    return '#';
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav className="bg-white border-b border-zinc-200 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <Container>
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/radio" className="flex items-center hover:opacity-80 transition-opacity">
                <img
                  src="/nk-logo-full.svg"
                  alt="NewsKoop"
                  className="h-12 w-auto"
                />
              </Link>
            </div>


            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {/* Home Link */}
              <Link
                href="/radio"
                className="px-4 py-2 rounded-lg text-zinc-700 hover:text-kelly-green hover:bg-kelly-green/5 transition-colors font-medium"
              >
                Home
              </Link>

              {/* Dynamic Menu Items */}
              {menuItems.map((item) => {
                // Skip dividers in main nav
                if (item.type === 'DIVIDER') return null;

                const hasChildren = item.children && item.children.length > 0;
                const itemUrl = getMenuUrl(item);
                const isExternal = item.type === 'CUSTOM_LINK' && item.openInNewTab;

                if (!hasChildren) {
                  // Direct link for items without children
                  return isExternal ? (
                    <a
                      key={item.id}
                      href={itemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg text-zinc-700 hover:text-kelly-green hover:bg-kelly-green/5 transition-colors font-medium"
                    >
                      {getMenuLabel(item)}
                    </a>
                  ) : (
                    <Link
                      key={item.id}
                      href={itemUrl}
                      className="px-4 py-2 rounded-lg text-zinc-700 hover:text-kelly-green hover:bg-kelly-green/5 transition-colors font-medium"
                    >
                      {getMenuLabel(item)}
                    </Link>
                  );
                }

                // Dropdown for items with children
                return (
                  <div key={item.id} className="relative group">
                    <Link
                      href={itemUrl}
                      className="px-4 py-2 rounded-lg text-zinc-700 hover:text-kelly-green hover:bg-kelly-green/5 transition-colors font-medium flex items-center gap-1"
                    >
                      {getMenuLabel(item)}
                      <ChevronDownIcon className="h-4 w-4" />
                    </Link>

                    {/* Dropdown Menu - Pure CSS hover */}
                    <div className="absolute left-0 pt-2 hidden group-hover:block">
                      <div className="w-56 bg-white rounded-lg shadow-lg border border-zinc-200 py-2">
                        <Link
                          href={itemUrl}
                          className="block px-4 py-2 text-sm text-zinc-700 hover:bg-kelly-green/5 hover:text-kelly-green font-medium"
                        >
                          All {getMenuLabel(item)}
                        </Link>
                        <div className="border-t border-zinc-100 my-1"></div>
                        {item.children!.map((child) => {
                          if (child.type === 'DIVIDER') {
                            return <div key={child.id} className="border-t border-zinc-100 my-1"></div>;
                          }
                          const childUrl = getMenuUrl(child);
                          const isChildExternal = child.type === 'CUSTOM_LINK' && child.openInNewTab;
                          return isChildExternal ? (
                            <a
                              key={child.id}
                              href={childUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block px-4 py-2 text-sm text-zinc-700 hover:bg-kelly-green/5 hover:text-kelly-green"
                            >
                              {getMenuLabel(child)}
                            </a>
                          ) : (
                            <Link
                              key={child.id}
                              href={childUrl}
                              className="block px-4 py-2 text-sm text-zinc-700 hover:bg-kelly-green/5 hover:text-kelly-green"
                            >
                              {getMenuLabel(child)}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right side: Notifications + User Menu + Mobile hamburger */}
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              {session?.user && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      setIsUserDropdownOpen(false);
                    }}
                    className="relative p-2 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                    aria-label="Notifications"
                  >
                    <BellIcon className="h-6 w-6" />
                    {announcements.length > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {announcements.length > 9 ? '9+' : announcements.length}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {isNotificationsOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsNotificationsOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-zinc-200 z-20 overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                          <p className="text-sm font-semibold text-zinc-900">
                            Notifications
                          </p>
                          {announcements.length > 0 && (
                            <Badge color="red" className="text-xs">
                              {announcements.length}
                            </Badge>
                          )}
                        </div>

                        {/* Announcement List */}
                        <div className="max-h-96 overflow-y-auto">
                          {announcements.length > 0 ? (
                            announcements.map((announcement: any) => (
                              <div
                                key={announcement.id}
                                className="px-4 py-3 border-b border-zinc-50 hover:bg-zinc-50 transition-colors"
                              >
                                <div className="flex items-start gap-2">
                                  {/* Priority dot */}
                                  <span
                                    className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                                      announcement.priority === 'HIGH'
                                        ? 'bg-red-500'
                                        : announcement.priority === 'MEDIUM'
                                        ? 'bg-amber-500'
                                        : 'bg-blue-500'
                                    }`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-zinc-900 truncate">
                                      {announcement.title}
                                    </p>
                                    <p className="text-xs text-zinc-600 line-clamp-2 mt-0.5">
                                      {announcement.message}
                                    </p>
                                    <p className="text-xs text-zinc-400 mt-1">
                                      {timeAgo(announcement.createdAt)}
                                    </p>
                                  </div>
                                  {/* Dismiss button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDismissAnnouncement(announcement.id);
                                    }}
                                    disabled={dismissMutation.isPending}
                                    className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded transition-colors flex-shrink-0"
                                    title="Dismiss"
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-8 text-center">
                              <BellIcon className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                              <p className="text-sm text-zinc-500">No new announcements</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* User Menu */}
              {session?.user && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(!isUserDropdownOpen);
                      setIsNotificationsOpen(false);
                    }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    <Avatar
                      className="h-8 w-8"
                      name={`${session.user.firstName} ${session.user.lastName}`}
                      src={profileData?.user?.profilePictureUrl}
                    />
                    <div className="hidden lg:block min-w-0 text-left">
                      <p className="text-sm font-semibold text-zinc-900">
                        {`${session.user.firstName} ${session.user.lastName}`}
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
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-zinc-200 z-20">
                        <div className="py-2">
                          {/* Profile Header */}
                          <div className="px-4 py-3 border-b border-zinc-100">
                            <p className="text-sm font-semibold text-zinc-900">
                              {`${session.user.firstName} ${session.user.lastName}`}
                            </p>
                          </div>

                          {/* Menu Items */}
                          <div className="py-1">
                            {/* Staff Navigation Links */}
                            {session.user.userType === 'STAFF' && (
                              <>
                                {(['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole || '')) && (
                                  <Link
                                    href="/admin"
                                    className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                                    onClick={() => setIsUserDropdownOpen(false)}
                                  >
                                    <ArrowLeftIcon className="h-4 w-4" />
                                    Admin Dashboard
                                  </Link>
                                )}

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

                                <div className="border-t border-zinc-100 my-1"></div>
                              </>
                            )}

                            <Link
                              href="/radio/profile"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                              onClick={() => setIsUserDropdownOpen(false)}
                            >
                              <UserIcon className="h-4 w-4" />
                              Profile & Settings
                            </Link>
                          </div>

                          {/* Sign Out */}
                          <div className="border-t border-zinc-100 py-1">
                            <button
                              onClick={() => {
                                setIsUserDropdownOpen(false);
                                signOut();
                              }}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                            >
                              <ArrowRightOnRectangleIcon className="h-4 w-4" />
                              Sign Out
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                type="button"
                className="md:hidden p-2 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </Container>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setIsMobileMenuOpen(false)} />

          <div className="fixed top-20 left-0 right-0 bg-white border-b border-zinc-200 shadow-lg">
            <Container className="py-4">

              {/* Navigation Links */}
              <div className="space-y-1 mb-6">
                {/* Home Link */}
                <Link
                  href="/radio"
                  className="block px-4 py-3 text-zinc-700 hover:text-kelly-green hover:bg-kelly-green/5 rounded-lg font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>

                {/* Dynamic Menu Items */}
                {menuItems.map((item) => {
                  // Skip dividers in mobile nav or show as visual separator
                  if (item.type === 'DIVIDER') {
                    return <div key={item.id} className="border-t border-zinc-200 my-2"></div>;
                  }

                  const hasChildren = item.children && item.children.length > 0;
                  const itemUrl = getMenuUrl(item);
                  const isExternal = item.type === 'CUSTOM_LINK' && item.openInNewTab;

                  if (!hasChildren) {
                    // Direct link for items without children
                    return isExternal ? (
                      <a
                        key={item.id}
                        href={itemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-4 py-3 text-zinc-700 hover:text-kelly-green hover:bg-kelly-green/5 rounded-lg font-medium"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {getMenuLabel(item)}
                      </a>
                    ) : (
                      <Link
                        key={item.id}
                        href={itemUrl}
                        className="block px-4 py-3 text-zinc-700 hover:text-kelly-green hover:bg-kelly-green/5 rounded-lg font-medium"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {getMenuLabel(item)}
                      </Link>
                    );
                  }

                  // Item with children
                  return (
                    <div key={item.id} className="space-y-1">
                      <Link
                        href={itemUrl}
                        className="block px-4 py-3 text-zinc-700 hover:text-kelly-green hover:bg-kelly-green/5 rounded-lg font-medium"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {getMenuLabel(item)}
                      </Link>
                      {/* Child items */}
                      <div className="pl-4 space-y-1">
                        {item.children!.map((child) => {
                          if (child.type === 'DIVIDER') {
                            return <div key={child.id} className="border-t border-zinc-100 my-1 mx-4"></div>;
                          }
                          const childUrl = getMenuUrl(child);
                          const isChildExternal = child.type === 'CUSTOM_LINK' && child.openInNewTab;
                          return isChildExternal ? (
                            <a
                              key={child.id}
                              href={childUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block px-4 py-2 text-sm text-zinc-600 hover:text-kelly-green hover:bg-kelly-green/5 rounded-lg"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {getMenuLabel(child)}
                            </a>
                          ) : (
                            <Link
                              key={child.id}
                              href={childUrl}
                              className="block px-4 py-2 text-sm text-zinc-600 hover:text-kelly-green hover:bg-kelly-green/5 rounded-lg"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {getMenuLabel(child)}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* User Info */}
              {session?.user && (
                <div className="border-t border-zinc-200 pt-4">
                  <div className="px-4 py-3 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      <Avatar
                        className="h-8 w-8"
                        name={`${session.user.firstName} ${session.user.lastName}`}
                        src={profileData?.user?.profilePictureUrl}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900">
                          {`${session.user.firstName} ${session.user.lastName}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    {/* Staff Navigation Links for Mobile */}
                    {session.user.userType === 'STAFF' && (
                      <>
                        {(['SUPERADMIN', 'ADMIN'].includes(session.user.staffRole || '')) && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <ArrowLeftIcon className="h-4 w-4" />
                            Admin Dashboard
                          </Link>
                        )}

                        {(['SUPERADMIN', 'EDITOR', 'SUB_EDITOR', 'JOURNALIST', 'INTERN'].includes(session.user.staffRole || '')) && (
                          <Link
                            href="/newsroom"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <ArrowLeftIcon className="h-4 w-4" />
                            Newsroom Dashboard
                          </Link>
                        )}

                        <div className="border-t border-zinc-100 my-2"></div>
                      </>
                    )}

                    <Link
                      href="/radio/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <UserIcon className="h-4 w-4" />
                      Profile & Settings
                    </Link>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        signOut();
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </Container>
          </div>
        </div>
      )}
    </>
  );
}
