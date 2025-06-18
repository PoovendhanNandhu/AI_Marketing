import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Create a Supabase client for client-side usage in the App Router
// Note: For realtime functionality, use dynamic-client.ts instead
export const createClient = () => {
  // Ensure environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase URL or Anon Key in environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
    );
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