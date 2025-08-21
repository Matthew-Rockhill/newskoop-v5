'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
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
} from '@heroicons/react/24/outline';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { CategoryMegaMenu } from './CategoryMegaMenu';

export function RadioNavbar() {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMegaMenu, setOpenMegaMenu] = useState<string | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

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

  // Fetch categories for navigation
  const { data: categoriesData } = useQuery({
    queryKey: ['radio-categories'],
    queryFn: async () => {
      const response = await fetch('/api/radio/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
    enabled: !!session,
  });

  // Sort categories in specific order
  const categoryOrder = ['News Bulletins', 'News Stories', 'Sports', 'Finance', 'Speciality'];
  const categories = (categoriesData?.categories || []).sort((a: any, b: any) => {
    const aIndex = categoryOrder.indexOf(a.name);
    const bIndex = categoryOrder.indexOf(b.name);
    
    // If both categories are in the predefined order, sort by that order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one is in the predefined order, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // If neither is in the predefined order, sort alphabetically
    return a.name.localeCompare(b.name);
  });

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

  const handleCategoryHover = (categorySlug: string) => {
    setOpenMegaMenu(categorySlug);
  };

  const handleCategoryLeave = () => {
    setOpenMegaMenu(null);
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 shadow-sm">
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
              {categories.map((category: any) => (
                <div
                  key={category.slug}
                  className="relative"
                  onMouseEnter={() => handleCategoryHover(category.slug)}
                  onMouseLeave={handleCategoryLeave}
                >
                  <Link
                    href={`/radio/${category.slug}`}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-gray-700 hover:text-kelly-green hover:bg-kelly-green/5 transition-colors font-medium"
                  >
                    {category.name}
                    <ChevronDownIcon className="h-4 w-4" />
                  </Link>

                  {/* Mega Menu */}
                  {openMegaMenu === category.slug && (
                    <CategoryMegaMenu
                      category={category}
                      onClose={() => setOpenMegaMenu(null)}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* User Menu */}
            <div className="flex items-center">
              {session?.user && (
                <div className="relative">
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Avatar
                      className="h-8 w-8"
                      name={`${session.user.firstName} ${session.user.lastName}`}
                      src={profileData?.user?.profilePictureUrl}
                    />
                    <div className="hidden lg:block min-w-0 text-left">
                      <p className="text-sm font-semibold text-gray-900">
                        {`${session.user.firstName} ${session.user.lastName}`}
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
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                        <div className="py-2">
                          {/* Profile Header */}
                          <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-900">
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
                                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => setIsUserDropdownOpen(false)}
                                  >
                                    <ArrowLeftIcon className="h-4 w-4" />
                                    Admin Dashboard
                                  </Link>
                                )}
                                
                                {(['SUPERADMIN', 'EDITOR', 'SUB_EDITOR', 'JOURNALIST', 'INTERN'].includes(session.user.staffRole || '')) && (
                                  <Link
                                    href="/newsroom"
                                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => setIsUserDropdownOpen(false)}
                                  >
                                    <ArrowLeftIcon className="h-4 w-4" />
                                    Newsroom Dashboard
                                  </Link>
                                )}
                                
                                <div className="border-t border-gray-100 my-1"></div>
                              </>
                            )}
                            
                            <Link
                              href="/radio/profile"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsUserDropdownOpen(false)}
                            >
                              <UserIcon className="h-4 w-4" />
                              Profile & Settings
                            </Link>
                          </div>
                          
                          {/* Sign Out */}
                          <div className="border-t border-gray-100 py-1">
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
                className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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
          
          <div className="fixed top-20 left-0 right-0 bg-white border-b border-gray-200 shadow-lg">
            <Container className="py-4">

              {/* Categories */}
              <div className="space-y-1 mb-6">
                {categories.map((category: any) => (
                  <Link
                    key={category.slug}
                    href={`/radio/${category.slug}`}
                    className="block px-4 py-3 text-gray-700 hover:text-kelly-green hover:bg-kelly-green/5 rounded-lg font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {category.name}
                    {category.storyCount > 0 && (
                      <Badge color="zinc" className="ml-2 text-xs">
                        {category.storyCount}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>

              {/* User Info */}
              {session?.user && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Avatar
                        className="h-8 w-8"
                        name={`${session.user.firstName} ${session.user.lastName}`}
                        src={profileData?.user?.profilePictureUrl}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
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
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <ArrowLeftIcon className="h-4 w-4" />
                            Admin Dashboard
                          </Link>
                        )}
                        
                        {(['SUPERADMIN', 'EDITOR', 'SUB_EDITOR', 'JOURNALIST', 'INTERN'].includes(session.user.staffRole || '')) && (
                          <Link
                            href="/newsroom"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <ArrowLeftIcon className="h-4 w-4" />
                            Newsroom Dashboard
                          </Link>
                        )}
                        
                        <div className="border-t border-gray-100 my-2"></div>
                      </>
                    )}
                    
                    <Link
                      href="/radio/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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