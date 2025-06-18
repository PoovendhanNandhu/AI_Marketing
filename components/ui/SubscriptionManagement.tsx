'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface SubscriptionInfo {
  hasActiveSubscription: boolean;
  subscriptionId?: string;
  planId?: string;
  planName?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

interface SubscriptionManagementProps {
  userId: string;
}

export function SubscriptionManagement({ userId }: SubscriptionManagementProps) {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchSubscriptionInfo();
    }
  }, [userId]);

  const fetchSubscriptionInfo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/stripe/customer/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      } else {
        throw new Error('Failed to fetch subscription info');
      }
    } catch (error) {
      console.error('Error fetching subscription info:', error);
      toast({
        title: 'Error',
        description: 'Could not fetch your subscription information.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePortalAccess = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: userId,
          returnUrl: window.location.href,
        }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast({
        title: 'Error',
        description: 'Could not access billing portal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const response = await fetch('http://localhost:3001/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription?.subscriptionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: 'Subscription Updated',
            description: 'Your subscription will be canceled at the end of the current billing period.',
          });
          // Refresh subscription data
          fetchSubscriptionInfo();
        }
      } else {
        throw new Error('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Error',
        description: 'Could not cancel your subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Information</CardTitle>
          <CardDescription>Subscribe to access premium features</CardDescription>
        </CardHeader>
        <CardContent>
          <p>You don't have an active subscription. Visit our pricing page to subscribe.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => window.location.href = '/pricing'}>View Pricing</Button>
        </CardFooter>
      </Card>
    );
  }

  if (!subscription.hasActiveSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Information</CardTitle>
          <CardDescription>Subscribe to access premium features</CardDescription>
        </CardHeader>
        <CardContent>
          <p>You don't have an active subscription. Visit our pricing page to subscribe.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => window.location.href = '/pricing'}>View Pricing</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Subscription</CardTitle>
        <CardDescription>Manage your current subscription</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium">Current Plan:</p>
          <p className="text-2xl font-bold">{subscription.planName}</p>
        </div>
        <div>
          <p className="font-medium">Status:</p>
          <div className="flex items-center mt-1">
            <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
            <p>Active</p>
          </div>
        </div>
        <div>
          <p className="font-medium">Renews On:</p>
          <p>
            {subscription.currentPeriodEnd
              ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
              : 'N/A'}
          </p>
        </div>
        {subscription.cancelAtPeriodEnd && (
          <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-md border border-amber-200 dark:border-amber-800">
            <p className="text-amber-800 dark:text-amber-200 font-medium">
              Your subscription will end on{' '}
              {subscription.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                : 'the end of your billing period'}.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-4">
        <Button onClick={handlePortalAccess} className="w-full sm:w-auto">
          Manage Billing
        </Button>
        {!subscription.cancelAtPeriodEnd && (
          <Button
            variant="outline"
            onClick={handleCancelSubscription}
            disabled={isCancelling}
            className="w-full sm:w-auto"
          >
            {isCancelling ? 'Processing...' : 'Cancel Subscription'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 