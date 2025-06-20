'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';

// Create a context for the Supabase client
type SupabaseContextType = {
  supabase: SupabaseClient | null;
  isLoading: boolean;
};

const SupabaseContext = createContext<SupabaseContextType>({
  supabase: null,
  isLoading: true,
});

// Create a provider component
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // Use a non-realtime client initially, handle the case where it might be null during build
  const [supabase] = useState(() => {
    try {
      return createClient();
    } catch (error) {
      console.warn('Failed to initialize Supabase client:', error);
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Effect for loading realtime capabilities on demand
  useEffect(() => {
    let isMounted = true;
    
    const loadRealtimeClient = async () => {
      try {
        // Only load the dynamic client for specific pages that need realtime
        // For example /chat-assistant or other pages with realtime features
        if (typeof window !== 'undefined' && 
            (window.location.pathname.includes('/chat-assistant') || 
             window.location.pathname.includes('/admin'))) {
          
          // Dynamically import the realtime client
          const { createDynamicClient } = await import('@/lib/supabase/dynamic-client');
          await createDynamicClient();
          
          if (isMounted) {
            console.log('Realtime client loaded successfully');
          }
        }
      } catch (error) {
        console.error('Failed to load realtime client:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadRealtimeClient();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  return (
    <SupabaseContext.Provider value={{ supabase, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
}

// Hook to use the Supabase client
export const useSupabase = () => useContext(SupabaseContext); 