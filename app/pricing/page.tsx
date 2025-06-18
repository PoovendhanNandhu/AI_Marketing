"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loadStripe } from '@stripe/stripe-js';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from "@/hooks/useAuth";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

type PlanFeature = string;

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  priceId: string;
  features: PlanFeature[];
}

// Default plans if API call fails
const defaultPlans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic AI Marketing',
    description: 'Essential AI marketing tools for small businesses',
    price: 29.99,
    currency: 'usd',
    interval: 'month',
    priceId: '',
    features: [
      'AI content suggestions',
      'Basic analytics',
      'Limited campaign automation',
    ],
  },
  {
    id: 'pro',
    name: 'Pro AI Marketing',
    description: 'Advanced AI marketing suite for growing businesses',
    price: 79.99,
    currency: 'usd',
    interval: 'month',
    priceId: '',
    features: [
      'All Basic features',
      'Advanced analytics',
      'Unlimited campaign automation',
      'A/B testing',
      'Custom AI models',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise AI Marketing',
    description: 'Complete AI marketing platform for large organizations',
    price: 199.99,
    currency: 'usd',
    interval: 'month',
    priceId: '',
    features: [
      'All Pro features',
      'Dedicated account manager',
      'API access',
      'Custom integrations',
      'Advanced security',
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [buttonLoading, setButtonLoading] = useState<{ [key: string]: boolean }>({});
  const supabase = createClient();
  // Use the auth hook to get user information
  const { user, isLoading: authLoading } = useAuth();
  // Track if plan data is loading
  const [plansLoading, setPlansLoading] = useState(true);
  
  // Fetch plans from the API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true);
        console.log("Fetching plans from API...");
        const response = await fetch('http://localhost:3001/api/stripe/plans');
        
        if (response.ok) {
          const plansData = await response.json();
          console.log("Plans fetched successfully:", plansData);
          
          if (plansData && plansData.length > 0) {
            // Check if any plan has a missing priceId
            const missingPriceIds = plansData.filter((plan: Plan) => !plan.priceId);
            if (missingPriceIds.length > 0) {
              console.warn("Some plans are missing priceId:", missingPriceIds);
            }
            
            setPlans(plansData);
          } else {
            console.warn("No plans returned from API, using defaults");
            setPlans(defaultPlans);
          }
        } else {
          console.error("Failed to fetch plans:", response.status, response.statusText);
          setPlans(defaultPlans);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        // Use default plans if API fails
        setPlans(defaultPlans);
      } finally {
        setPlansLoading(false);
      }
    };
    
    fetchPlans();
  }, []);
  
  const handleSubscription = async (planId: string, priceId: string) => {
    if (!priceId) {
      console.error("Cannot subscribe - priceId is empty for plan:", planId);
      toast({
        title: "Error",
        description: "Price ID is missing for this plan. Please contact support.",
        variant: "destructive",
      });
      return;
    }
    
    if (!user) {
      console.error("Cannot subscribe - user is not authenticated");
      toast({
        title: "Authentication Required",
        description: "Please log in to subscribe to a plan.",
        variant: "destructive",
      });
      router.push('/login?redirect=/pricing');
      return;
    }
    
    setButtonLoading({ ...buttonLoading, [planId]: true });
    
    try {
      console.log(`Creating checkout session for plan ${planId} with price ${priceId} for user ${user.id}`);
      
      // Map known test user ID to the correct Stripe customer ID
      // This is a temporary solution for testing purposes
      let stripeCustomerId = user.id;
      if (user.id === 'd555b3ff-d556-4aa0-93ac-3b762fdc4d41') {
        stripeCustomerId = 'cus_SIzIg12EWm98rb';
        console.log(`Using known Stripe customer ID: ${stripeCustomerId} for user: ${user.id}`);
      }
      
      const response = await fetch('http://localhost:3001/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          customerId: stripeCustomerId,
          successUrl: `${window.location.origin}/article-writer?subscription=success`,
          cancelUrl: `${window.location.origin}/pricing?subscription=canceled`,
        }),
      });
      
      const data = await response.json();
      console.log("Checkout session response:", data);
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned. Full response:", JSON.stringify(data));
        throw new Error(`No checkout URL returned: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      let errorMessage = 'Could not start checkout process. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = `Checkout error: ${error.message}`;
        console.error('Error details:', errorMessage);
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        open: true,
      });
    } finally {
      setButtonLoading({ ...buttonLoading, [planId]: false });
    }
  };
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Show loading state while plans or auth are loading
  if (plansLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Choose the perfect plan for your AI marketing needs.
          </p>
        </div>
        
        <div className="flex justify-center items-center h-[50vh]">
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-10 w-10 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="mt-4 text-muted-foreground">Loading pricing information...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Choose the perfect plan for your AI marketing needs. All plans include our core AI marketing platform.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <Card 
            key={plan.id}
            className={`flex flex-col ${plan.id === 'pro' ? 'border-primary shadow-lg relative' : ''}`}
          >
            {plan.id === 'pro' && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                Popular
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1">
              <div className="mb-6">
                <span className="text-4xl font-bold">{formatCurrency(plan.price, plan.currency)}</span>
                <span className="text-muted-foreground">/{plan.interval}</span>
              </div>
              
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => handleSubscription(plan.id, plan.priceId)}
                disabled={!plan.priceId || buttonLoading[plan.id]}
              >
                {buttonLoading[plan.id] ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Subscribe'
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="mt-20 text-center max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Have questions about our plans?</h2>
        <p className="mb-6 text-muted-foreground">
          Our team is ready to help you choose the best plan for your needs. Contact us for a personalized demo.
        </p>
        <Button 
          onClick={() => router.push('/contact')}
          variant="outline"
          className="px-8"
        >
          Contact Sales
        </Button>
      </div>
    </div>
  );
} 