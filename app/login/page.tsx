"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Chrome } from 'lucide-react'; 
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<any>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Initialize Supabase client on the client side
  useEffect(() => {
    try {
      const client = createClient();
      setSupabase(client);
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      setError('Failed to initialize authentication. Please refresh the page.');
    }
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    if (!supabase) return;
    
    const checkSession = async () => {
      try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // User is already logged in, redirect to home
        router.replace('/');
      }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
      setCheckingSession(false);
      }
    };
    
    checkSession();
  }, [router, supabase]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setError('Authentication not available. Please refresh the page.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        // Sign-in successful, redirect or refresh
        router.push('/'); // Redirect to home page after login
        router.refresh(); // Refresh to update session state if needed
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setError('Authentication not available. Please refresh the page.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/v1/callback`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
      }
    } catch (err) {
       console.error('Google Sign in error:', err);
       setError('Could not sign in with Google. Please try again.');
    } finally {
      // setLoading(false); // Keep loading as redirect will occur
    }
  };

  if (checkingSession) {
    return null; // Show nothing while checking session
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4 pt-20"> {/* Added padding top */} 
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Log In</CardTitle>
          <CardDescription>Welcome back! Enter your credentials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              {/* Optional: Add Forgot Password link here */}
            </div>
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging In...' : 'Log In with Email'}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2" 
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <Chrome className="h-4 w-4" /> 
            Log In with Google
          </Button>

        </CardContent>
        <CardFooter className="text-center text-sm">
          Don't have an account? 
          <Link href="/signup" className="underline ml-1">
            Sign Up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
} 