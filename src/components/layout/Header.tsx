'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Container from '../ui/Container';
import { Button } from '../ui/button';
import { Link } from '../ui/link';
import Logo from '../shared/Logo';

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
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [transparent]);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        transparent 
          ? isScrolled 
            ? 'bg-white shadow-sm border-b border-[#76BD43]' 
            : 'bg-transparent'
          : 'bg-white shadow-sm border-b border-gray-100'
      }`}
    >
      <Container>
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="bg-transparent">
            <Logo 
              className="h-12 w-auto bg-transparent" 
              variant={transparent && !isScrolled ? 'transparent-white' : 'full'} 
            />
          </Link>

          <div className="hidden md:block">
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
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`md:hidden p-2 rounded-md ${
              transparent && !isScrolled ? 'text-white' : 'text-gray-600'
            }`}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className={`md:hidden py-4 border-t ${
            transparent && !isScrolled ? 'border-white/20' : 'border-gray-100'
          }`}>
            <div className="flex flex-col space-y-4">
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
            </div>
          </div>
        )}
      </Container>
    </header>
  );
} 