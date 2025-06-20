"use client";

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { UserCircle, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useScroll, useMotionValueEvent } from "motion/react";
import type { Session } from '@supabase/supabase-js';
import { useSupabase } from '@/app/SupabaseProvider';
import {
  Navbar,
  NavBody,
  NavItems,
  NavbarLogo,
  NavbarButton,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle
} from '@/components/ui/resizable-navbar';
import Link from 'next/link';

// Define Nav Items (copied from layout.tsx)
const navItems = [
  { name: "Article Writer", link: "/article-writer" },
  { name: "AI Apps", link: "/ai-apps" },
  { name: "Chat Assistant", link: "/chat-assistant" },
  { name: "Pricing", link: "/pricing" },
  { name: "Contact", link: "/contact" },
];

// Updated DesktopNavActions for Auth - now using Supabase Context
const DesktopNavActions = ({ visible, session }: { visible?: boolean; session: Session | null }) => {
  const { supabase } = useSupabase();
  const router = useRouter();

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push('/'); // Redirect home after logout
    router.refresh(); // Refresh to update session
  };

  return (
    <div className="flex items-center gap-x-2 ml-auto z-20">
      {session ? (
        // User is logged in
        <>
          <NavbarButton 
            href="/profile"
            variant="secondary" 
            className="p-2" 
            title="Profile"
          >
            <UserCircle className="h-5 w-5" />
          </NavbarButton>
        <NavbarButton 
          onClick={handleLogout} 
          variant="secondary" 
          className="p-2" 
          as="button"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </NavbarButton>
        </>
      ) : (
        // User is logged out
        visible ? (
          // Show icon when scrolled
          <NavbarButton href="/login" variant="secondary" className="p-2" title="Login/Account">
            <UserCircle className="h-5 w-5" />
          </NavbarButton>
        ) : (
          // Show buttons when not scrolled
          <>
            <NavbarButton href="/login" variant="secondary">Login</NavbarButton>
            <NavbarButton href="/signup" variant="primary">Sign Up</NavbarButton>
          </>
        )
      )}
    </div>
  );
};

// Mobile Navigation Actions - now using Supabase Context
const MobileNavActions = ({ session }: { session: Session | null }) => {
  const { supabase } = useSupabase();
  const router = useRouter();
  
  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };
  
  return (
    <div className="flex flex-col gap-y-2 mt-4 border-t pt-4 w-full">
      {session ? (
        <>
          <NavbarButton href="/profile" variant="secondary" className="w-full justify-center">
            Profile
          </NavbarButton>
          <NavbarButton onClick={handleLogout} variant="secondary" className="w-full justify-center" as="button">
            Logout
          </NavbarButton>
        </>
      ) : (
        <>
          <NavbarButton href="/login" variant="secondary" className="w-full justify-center">
            Login
          </NavbarButton>
          <NavbarButton href="/signup" variant="primary" className="w-full justify-center">
            Sign Up
          </NavbarButton>
        </>
      )}
    </div>
  );
};

export function MainLayoutClient({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const { supabase, isLoading } = useSupabase();
  const router = useRouter();

  // Match the initial UI to the server-rendered UI to avoid flashing
  // Set initial value based on pathname to prevent navbar flash during load
  const [isHidden, setIsHidden] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.scrollY > 100 && window.location.pathname !== '/';
    }
    return false;
  });
  
  const [scrollYPrevious, setScrollYPrevious] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.scrollY;
    }
    return 0;
  });
  
  const [isScrolled, setIsScrolled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.scrollY > 100;
    }
    return false;
  });

  // Initialize with value from localStorage if available, to reduce UI flicker
  const [session, setSession] = useState<Session | null>(() => {
    // Only run in browser, not during SSR
    if (typeof window !== 'undefined') {
      const savedSession = localStorage.getItem('userSession');
      return savedSession ? JSON.parse(savedSession) : null;
    }
    return null;
  });
  const [loadingSession, setLoadingSession] = useState(false);

  // Fetch initial session & subscribe to auth changes
  useEffect(() => {
    if (!supabase || isLoading) return;

    setLoadingSession(true);
    
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        // Save to localStorage for next page load
        if (session) {
          localStorage.setItem('userSession', JSON.stringify(session));
        } else {
          localStorage.removeItem('userSession');
        }
      } catch (error) {
        console.error('Error getting session:', error);
        setSession(null);
      } finally {
        setLoadingSession(false);
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        // Update localStorage when auth state changes
        if (session) {
          localStorage.setItem('userSession', JSON.stringify(session));
        } else {
          localStorage.removeItem('userSession');
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, isLoading]);

  // Determine if navbar should always be fully visible (not shrunk)
  const forceFullNavbar = 
    pathname === '/article-writer' || 
    pathname === '/chat-assistant' || 
    pathname === '/ai-apps' ||
    pathname === '/login' || // Keep navbar expanded on auth pages
    pathname === '/signup'; 

  // Scroll event listener
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 100);
    if (pathname !== '/') {
      const scrollDirection = latest - scrollYPrevious;
      if (scrollDirection > 0 && latest > 100) { 
          setIsHidden(true);
      } else if (scrollDirection < 0 || latest < 50) { 
          setIsHidden(false);
      }
    } else {
      setIsHidden(false); 
    }
    setScrollYPrevious(latest);
  });

  // Determine the effective visibility state for resizing/blur
  const effectiveVisible = forceFullNavbar ? false : isScrolled;

  const handleMobileLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMobileMenuOpen(false); // Close menu
    router.push('/'); 
    router.refresh();
  };

  // Show minimal loading UI while Supabase is loading
  if (isLoading) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Navbar className="top-0 sticky" visible={undefined}>
          <NavBody className="max-w-full px-6"> 
            <NavbarLogo />
            <NavItems items={navItems} />
            <div className="flex items-center gap-x-2 ml-auto z-20">
              <div className="h-9 w-16 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
              <div className="h-9 w-20 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
            </div>
          </NavBody>
          <MobileNav className="px-4"> 
            <MobileNavHeader>
              <NavbarLogo />
              <MobileNavToggle isOpen={false} onClick={() => {}} />
            </MobileNavHeader>
          </MobileNav>
        </Navbar>
        
        {children}
        
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Navbar className="top-0 sticky" shouldHide={isHidden} visible={effectiveVisible ? true : undefined}>
          {/* Desktop Navbar */}
          <NavBody className="max-w-full px-6"> 
            <NavbarLogo />
            <NavItems items={navItems} />
            {/* Pass session to DesktopNavActions - show loading state if needed */} 
            <DesktopNavActions visible={effectiveVisible} session={loadingSession ? null : session}/> 
          </NavBody>

          {/* Mobile Navbar */}
          <MobileNav className="px-4"> 
            <MobileNavHeader>
              <NavbarLogo />
              <MobileNavToggle isOpen={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
            </MobileNavHeader>
            
            {/* Mobile menu */}
            <MobileNavMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
              <NavItems items={navItems} onItemClick={() => setMobileMenuOpen(false)} className="flex-col w-full" />
              {/* Pass the session to MobileNavActions */}
              <MobileNavActions session={loadingSession ? null : session} />
            </MobileNavMenu>
          </MobileNav>
      </Navbar>

      <main>{children}</main>
      <Toaster />
    </ThemeProvider>
  );
} 