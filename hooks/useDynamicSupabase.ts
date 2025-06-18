import { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A hook that dynamically imports the Supabase client
 * This avoids including the WebSocket modules in the initial browser bundle
 */
export function useDynamicSupabase() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadClient() {
      try {
        // Dynamically import the Supabase client
        const { createDynamicClient } = await import('@/lib/supabase/dynamic-client');
        const supabase = await createDynamicClient();
        setClient(supabase);
      } catch (err) {
        console.error('Failed to load Supabase client:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    }

    loadClient();
  }, []);

  return { client, loading, error };
} 