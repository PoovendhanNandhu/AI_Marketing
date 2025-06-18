import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';

interface SubscriptionUsage {
  article_generations_used: number;
  article_generations_limit: number;
  chat_messages_used: number;
  chat_messages_limit: number;
  image_generations_used: number;
  image_generations_limit: number;
  plan_id: string;
  status: string;
  current_period_end: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionUsage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Function to check if user can perform an action based on usage
  const canUseFeature = (feature: 'article' | 'chat' | 'image'): boolean => {
    if (!subscription) return false;
    
    switch (feature) {
      case 'article':
        return subscription.article_generations_used < subscription.article_generations_limit;
      case 'chat':
        return subscription.chat_messages_used < subscription.chat_messages_limit;
      case 'image':
        return subscription.image_generations_used < subscription.image_generations_limit;
      default:
        return false;
    }
  };

  // Function to get the remaining usage for a feature
  const getRemainingUsage = (feature: 'article' | 'chat' | 'image'): number => {
    if (!subscription) return 0;
    
    switch (feature) {
      case 'article':
        return Math.max(0, subscription.article_generations_limit - subscription.article_generations_used);
      case 'chat':
        return Math.max(0, subscription.chat_messages_limit - subscription.chat_messages_used);
      case 'image':
        return Math.max(0, subscription.image_generations_limit - subscription.image_generations_used);
      default:
        return 0;
    }
  };

  // Function to get usage percentage for a feature
  const getUsagePercentage = (feature: 'article' | 'chat' | 'image'): number => {
    if (!subscription) return 0;
    
    switch (feature) {
      case 'article':
        return (subscription.article_generations_used / subscription.article_generations_limit) * 100;
      case 'chat':
        return (subscription.chat_messages_used / subscription.chat_messages_limit) * 100;
      case 'image':
        return (subscription.image_generations_used / subscription.image_generations_limit) * 100;
      default:
        return 0;
    }
  };

  // Check if the user is on a premium plan
  const isPremium = (): boolean => {
    if (!subscription) return false;
    return subscription.plan_id !== 'free';
  };

  // Fetch subscription data
  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError(userError?.message || 'User not authenticated');
        setLoading(false);
        return;
      }
      
      // Fetch subscription data
      const { data, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (subError) {
        setError(subError.message);
        setLoading(false);
        return;
      }
      
      setSubscription(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error fetching subscription');
    } finally {
      setLoading(false);
    }
  };

  // Load subscription data on component mount
  useEffect(() => {
    fetchSubscription();
  }, []);

  return {
    subscription,
    loading,
    error,
    canUseFeature,
    getRemainingUsage,
    getUsagePercentage,
    isPremium,
    refreshSubscription: fetchSubscription,
  };
} 