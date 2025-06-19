'use client';

import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  isLoggedIn?: boolean;
  transparent?: boolean;
}

export default function Layout({ children, isLoggedIn = false, transparent = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <Header isLoggedIn={isLoggedIn} transparent={transparent} />
      <main>{children}</main>
      <Footer />
    </div>
  );
} 