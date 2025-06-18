import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
// Remove imports that are now in MainLayoutClient
// import { ThemeProvider } from "@/components/theme-provider";
// import { Toaster } from "@/components/ui/toaster";
// import { Navbar, ... } from '@/components/ui/resizable-navbar';
// import React from 'react'; 

// Import the new client wrapper
import { MainLayoutClient } from '@/components/MainLayoutClient'; 
import { SupabaseProvider } from './SupabaseProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WriteGenius - AI Writing Assistant',
  description: 'Your all-in-one AI writing platform for content creation',
};

// Remove navItems definition - it's now in MainLayoutClient

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove useState - it's now in MainLayoutClient
  // const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Wrap with SupabaseProvider to handle WebSocket issues */}
        <SupabaseProvider>
          {/* Use the client wrapper component */}
          <MainLayoutClient>
            {children}
          </MainLayoutClient>
        </SupabaseProvider>
      </body>
    </html>
  );
}