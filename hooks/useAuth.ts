import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type AuthState = {
  session: Session | null;
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

/**
 * Custom hook to handle authentication state
 * @param {boolean} requireAuth - Whether the current page requires authentication
 * @param {string} redirectTo - Where to redirect if authentication is required but user is not logged in
 */
export function useAuth(requireAuth = false, redirectTo = '/login') {
  const supabase = createClient();
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Function to check and set auth state
    const checkAuth = async () => {
      try {
        // Try to get session from localStorage first for a faster response
        let cachedSession = null;
        if (typeof window !== 'undefined') {
          const savedSession = localStorage.getItem('userSession');
          if (savedSession) {
            try {
              cachedSession = JSON.parse(savedSession);
              // Use cached session temporarily to prevent UI flash
              setAuthState({
                session: cachedSession,
                user: cachedSession?.user || null,
                isLoading: true, // Still loading real session
                isAuthenticated: !!cachedSession,
              });
            } catch (e) {
              console.error('Error parsing cached session:', e);
            }
          }
        }

        // Always verify with Supabase
        const { data } = await supabase.auth.getSession();
        const currentSession = data.session;
        
        // Update state with the actual session
        setAuthState({
          session: currentSession,
          user: currentSession?.user || null,
          isLoading: false,
          isAuthenticated: !!currentSession,
        });

        // Save to localStorage if there is a valid session
        if (currentSession) {
          localStorage.setItem('userSession', JSON.stringify(currentSession));
        } else {
          localStorage.removeItem('userSession');
        }

        // Handle redirection if authentication is required
        if (requireAuth && !currentSession) {
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
          const redirectPath = `${redirectTo}${currentPath ? `?redirect=${encodeURIComponent(currentPath)}` : ''}`;
          router.replace(redirectPath);
        }
      } catch (error) {
        console.error('Error in auth state:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        
        if (requireAuth) {
          router.replace(redirectTo);
        }
      }
    };

    // Check auth immediately
    checkAuth();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        setAuthState({
          session,
          user: session?.user || null,
          isLoading: false,
          isAuthenticated: !!session,
        });

        // Update localStorage
        if (session) {
          localStorage.setItem('userSession', JSON.stringify(session));
        } else {
          localStorage.removeItem('userSession');
          
          // Redirect if auth is required
          if (requireAuth) {
            router.replace(redirectTo);
          }
        }
      }
    );

    // Cleanup subscription
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router, requireAuth, redirectTo]);

  // Expose auth methods along with state
  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return {
    ...authState,
    signOut,
  };
} 