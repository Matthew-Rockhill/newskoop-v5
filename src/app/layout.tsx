import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { Providers } from '@/components/providers/Providers';

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

const sora = Sora({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-sora',
  weight: ['400', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: "Newskoop",
  description: "Media content agency that sources, creates and produces content for radio",
  icons: {
    icon: '/nk-favicon.png',
    shortcut: '/nk-favicon.png',
    apple: '/nk-favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.variable} ${sora.variable} ${inter.className} h-full antialiased text-zinc-950`}
      >
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
