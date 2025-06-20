import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

// Store a singleton instance
let supabaseInstance: SupabaseClient | null = null;

// Create a Supabase client for client-side usage with dynamic import
export const createDynamicClient = async () => {
  // Return existing instance if available
  if (supabaseInstance) return supabaseInstance;
  
  // Ensure environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build time or SSR, environment variables might not be available
  // Return null to prevent build failures but allow runtime initialization
  if (!supabaseUrl || !supabaseAnonKey) {
    // Check if we're in a build environment or server-side
    if (typeof window === 'undefined') {
      console.warn('Supabase environment variables not available during build/SSR. This is expected for static generation.');
      return null as any;
    }
    
    // For client-side, log the error but don't throw to prevent crashes
    console.error('Missing Supabase URL or Anon Key in environment variables. Authentication features will not work.');
    return null as any;
  }

  // Add global headers for all requests
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Content-Profile': 'public',
    'Accept-Profile': 'public',
    'Prefer': 'return=representation'
  };

  // Create client on demand
  supabaseInstance = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    options: {
      global: {
        headers
      },
      db: {
        schema: 'public'
      }
    }
  });

  return supabaseInstance;
}; 