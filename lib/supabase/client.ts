import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Create a Supabase client for client-side usage in the App Router
// Note: For realtime functionality, use dynamic-client.ts instead
export const createClient = () => {
  // Ensure environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build time or SSR, environment variables might not be available
  // Return null to prevent build failures but allow runtime initialization
  if (!supabaseUrl || !supabaseAnonKey) {
    // Check if we're in a build environment or server-side
    if (typeof window === 'undefined') {
      console.warn('Supabase environment variables not available during build/SSR. This is expected for static generation.');
      // Return null for build-time, will be handled by client-side checks
      return null as any;
    }
    
    // For client-side, log the error but don't throw to prevent crashes
    console.error('Missing Supabase URL or Anon Key in environment variables. Authentication features will not work.');
    return null as any;
  }

  // Add global headers for all requests
  // These headers specifically address the 406 errors with PostgrestREST
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Content-Profile': 'public',
    'Accept-Profile': 'public',
    'Prefer': 'return=representation'
  };

  return createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    options: {
      global: {
        headers
      },
      db: {
        schema: 'public'
      },
      realtime: {
        // Disable realtime to avoid WebSocket issues
        params: {
          eventsPerSecond: 0
        }
      }
    }
  });
}; 