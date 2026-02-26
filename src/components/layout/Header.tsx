'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Link } from '../ui/link';
import Logo from '../shared/Logo';

const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

interface HeaderProps {
  isLoggedIn?: boolean;
  transparent?: boolean;
}

export default function Header({ isLoggedIn = false, transparent = false }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!transparent) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [transparent]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        transparent
          ? isScrolled
            ? 'bg-white shadow-sm border-b border-kelly-green'
            : 'bg-transparent'
          : 'bg-white shadow-sm border-b border-zinc-100'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="bg-transparent">
            <Logo
              className="h-12 w-auto bg-transparent"
              variant={transparent && !isScrolled ? 'transparent-white' : 'full'}
            />
          </Link>

          {/* Right side: Login + Hamburger */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Button
                color={transparent && !isScrolled ? "white" : "primary"}
                href="/logout"
              >
                LOGOUT
              </Button>
            ) : (
              <Button
                color={transparent && !isScrolled ? "white" : "primary"}
                href="/login"
              >
                LOGIN
              </Button>
            )}

            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 rounded-md ${
                  transparent && !isScrolled ? 'text-white' : 'text-zinc-600'
                }`}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* Dropdown Navigation */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-white shadow-lg border border-zinc-100 py-2">
                  {navLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm font-semibold tracking-wide uppercase text-zinc-700 hover:text-[#76BD43] hover:bg-zinc-50 transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
