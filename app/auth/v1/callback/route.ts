import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add this export to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  
  try {
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const error_description = requestUrl.searchParams.get('error_description');

    // Log all parameters for debugging
    console.log('Auth callback parameters:', {
      code: code ? 'present' : 'missing',
      error,
      error_description,
      url: request.url
    });

    if (error) {
      console.error('Auth error:', error, error_description);
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(error_description || 'Authentication failed')}`
      );
    }

    if (!code) {
      console.error('No code provided in callback');
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent('No authentication code provided')}`
      );
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Exchange the code for a session
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Session error:', {
        message: sessionError.message,
        status: sessionError.status,
        name: sessionError.name
      });
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(sessionError.message)}`
      );
    }

    if (!data.session) {
      console.error('No session data received');
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent('Failed to create session')}`
      );
    }

    // Successful authentication
    console.log('Authentication successful');
    return NextResponse.redirect(requestUrl.origin);
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent('An unexpected error occurred')}`
    );
  }
} 