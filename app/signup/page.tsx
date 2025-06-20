"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'; // Import Supabase client utility
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Chrome } from 'lucide-react'; // Using Chrome icon for Google
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<any>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setError('Authentication not available. Please refresh the page.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Optional: Add email redirect URL if needed for email confirmation
          // emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        // Optionally, redirect the user or show a confirmation message
        // router.push('/'); // Example redirect
        setMessage("Check your email for the confirmation link!"); 
        // Clear form
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      console.error('Sign up error:', err);
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
          // Updated to match Google Cloud Console configuration
          redirectTo: `${window.location.origin}/auth/v1/callback`, 
        },
      });

      if (oauthError) {
        setError(oauthError.message);
      }
      // Note: Supabase handles the redirect to Google and back
    } catch (err) {
      console.error('Google Sign in error:', err);
      setError('Could not sign in with Google. Please try again.');
    } finally {
       // Keep loading true as redirect will happen
       // setLoading(false); 
    }
  };

  if (checkingSession) {
    return null; // Show nothing while checking session
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4 pt-20"> {/* Added padding top */} 
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription>Enter your details below to sign up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSignUp} className="space-y-4">
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
                minLength={6} // Supabase default minimum
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            {message && (
              <p className="text-sm text-green-500 text-center">{message}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing Up...' : 'Sign Up with Email'}
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
            Sign Up with Google
          </Button>

        </CardContent>
        <CardFooter className="text-center text-sm">
          Already have an account? 
          <Link href="/login" className="underline ml-1">
            Log In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
} 