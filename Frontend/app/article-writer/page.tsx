"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedParagraphs } from "@/components/ui/animated-paragraphs";
import { createClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAnonymousUsage } from "@/hooks/useAnonymousUsage";

export default function ArticleWriter() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  // Use auth hook without requiring auth to allow anonymous users
  const { user, isLoading: authLoading, isAuthenticated } = useAuth(false);
  // Anonymous usage tracking with device fingerprinting
  const { 
    usageCount: anonymousUsageCount, 
    deviceId: deviceFingerprint,
    incrementUsage: incrementAnonymousUsage 
  } = useAnonymousUsage();
  
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [generatedContent, setGeneratedContent] = useState("");
  const [keywords, setKeywords] = useState("");
  const [audience, setAudience] = useState("general");
  const [style, setStyle] = useState("informative");
  const [structure, setStructure] = useState("default");
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [usageData, setUsageData] = useState<{
    used: number;
    limit: number;
    limitReached: boolean;
  }>({
    used: 0,
    limit: 0,
    limitReached: false
  });

  // Check for subscription success message
  useEffect(() => {
    // Check URL parameters for subscription success
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      toast({
        title: "Subscription Successful!",
        description: "Welcome to your premium article writer. You now have access to unlimited article generations.",
      });
      
      // Remove the parameter from URL to prevent showing the toast on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [toast]);

  // Load user data and set usage limits
  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) return;
    
    // For non-authenticated users, use anonymous usage tracking
    if (!isAuthenticated) {
      console.log("User not authenticated, using device fingerprinting for tracking");
      console.log("Device fingerprint:", deviceFingerprint);
      
      const ANONYMOUS_LIMIT = 5;
      
      setUsageData({
        used: anonymousUsageCount,
        limit: ANONYMOUS_LIMIT,
        limitReached: anonymousUsageCount >= ANONYMOUS_LIMIT
      });
      
      setIsLoading(false);
      return;
    }
    
    // For authenticated users, load their subscription data
    const loadUserSubscription = async () => {
      try {
        // Check if the user already has a subscription
        const { data: subscriptions, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching subscriptions:", error);
        }
        
        // If user has multiple subscriptions, use the most recent one
        if (subscriptions && subscriptions.length > 0) {
          console.log(`Found ${subscriptions.length} subscriptions, using most recent:`, subscriptions[0]);
          const activeSubscription = subscriptions[0];
          setSubscription(activeSubscription);
          
          // -1 indicates unlimited
          const isUnlimited = activeSubscription.article_generations_limit === -1;
          
          setUsageData({
            used: activeSubscription.article_generations_used || 0,
            limit: isUnlimited ? Infinity : activeSubscription.article_generations_limit,
            limitReached: !isUnlimited && 
              activeSubscription.article_generations_used >= activeSubscription.article_generations_limit
          });
        } else {
          // No subscriptions found, create one
          console.log("No subscription found, creating a default one");
          
          const { data: newSub, error: createError } = await supabase
            .rpc('create_subscription_if_not_exists', {
              user_id_param: user?.id,
              plan_id_param: 'free',
              status_param: 'active',
              article_limit_param: 5,
              chat_limit_param: 300
            });
            
          if (createError) {
            console.error("Error creating subscription:", createError);
            
            // Try direct insert as fallback
            const { data: insertResult, error: insertError } = await supabase
              .from('user_subscriptions')
              .insert({
                user_id: user?.id,
                plan_id: 'free',
                status: 'active',
                article_generations_used: 0,
                article_generations_limit: 5,
                chat_messages_used: 0,
                chat_messages_limit: 300,
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              })
              .select()
              .single();
              
            if (insertError) {
              console.error("Error with fallback insert:", insertError);
              // Use default values
              setSubscription({
                plan_id: 'free',
                status: 'active',
                article_generations_used: 0,
                article_generations_limit: 5,
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              });
              
              setUsageData({
                used: 0,
                limit: 5,
                limitReached: false
              });
            } else if (insertResult) {
              console.log("Created new subscription via fallback:", insertResult);
              setSubscription(insertResult);
              
              setUsageData({
                used: 0,
                limit: 5,
                limitReached: false
              });
            }
          } else if (newSub) {
            console.log("Created/retrieved subscription via RPC:", newSub);
            setSubscription(newSub);
            
            setUsageData({
              used: 0,
              limit: 5,
              limitReached: false
            });
          }
        }
        
        // Check for Stripe subscription
        checkStripeSubscription();
        
        // Loading complete
        setIsLoading(false);
      } catch (err) {
        console.error("Unexpected error managing subscription:", err);
        // Fallback to default values
        setSubscription({
          plan_id: 'free',
          status: 'active',
          article_generations_used: 0,
          article_generations_limit: 5,
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        setUsageData({
          used: 0,
          limit: 5,
          limitReached: false
        });
        
        setIsLoading(false);
      }
    };
    
    loadUserSubscription();
  }, [user, authLoading, isAuthenticated, anonymousUsageCount, deviceFingerprint, supabase]);

  // Check if authenticated user has a paid subscription from Stripe
  const checkStripeSubscription = useCallback(async () => {
    if (!user || !isAuthenticated) return;
    
    try {
      console.log("Checking Stripe subscription status for user:", user.id);
      // Use the mapped customer ID if available (same as in pricing page)
      let stripeCustomerId = user.id;
      if (user.id === 'd555b3ff-d556-4aa0-93ac-3b762fdc4d41') {
        stripeCustomerId = 'cus_SIzIg12EWm98rb';
        console.log(`Using known Stripe customer ID: ${stripeCustomerId}`);
      }
      
      // Get subscription info from Stripe
      const response = await fetch(`http://localhost:3001/api/stripe/customer/${stripeCustomerId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch subscription: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Stripe subscription data:", data);
      
      // If user has an active subscription from Stripe
      if (data.hasActiveSubscription) {
        console.log("User has an active Stripe subscription. Updating limits to unlimited.");
        
        // Update the Supabase subscription to have unlimited generations
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            plan_id: data.planId || 'paid',
            status: 'active',
            article_generations_limit: -1, // -1 indicates unlimited
            chat_messages_limit: -1, // unlimited messages too
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
          
        if (error) {
          console.error("Error updating subscription in Supabase:", error);
        } else {
          // Update the state to reflect unlimited generations
          setSubscription((prev: any) => ({
            ...prev,
            plan_id: data.planId || 'paid',
            status: 'active',
            article_generations_limit: -1
          }));
          
          setUsageData((prev: { used: number; limit: number; limitReached: boolean }) => ({
            ...prev,
            limit: Infinity,
            limitReached: false
          }));
          
          toast({
            title: "Subscription activated",
            description: "Your paid subscription has been applied. You now have unlimited article generations.",
          });
        }
      }
    } catch (error) {
      console.error("Error checking Stripe subscription:", error);
    }
  }, [user, isAuthenticated, supabase, toast]);

  // Update usage count (different handling for anonymous vs authenticated users)
  const updateUsageCount = useCallback(async () => {
    if (!isAuthenticated) {
      // For anonymous users, increment the fingerprinted usage count
      const newCount = incrementAnonymousUsage();
      
      // Update local state
      setUsageData(prev => ({
        ...prev,
        used: newCount,
        limitReached: newCount >= prev.limit
      }));
      
      return;
    }
    
    // For authenticated users, update database
    if (!user || !subscription) return;
    
    try {
      // Increment article generations used
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          article_generations_used: (subscription.article_generations_used || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error("Error updating usage count:", error);
      } else {
        // Update local state
        setSubscription({
          ...subscription,
          article_generations_used: (subscription.article_generations_used || 0) + 1
        });
        
        setUsageData(prev => ({
          ...prev,
          used: prev.used + 1,
          limitReached: prev.limit !== Infinity && prev.used + 1 >= prev.limit
        }));
      }
    } catch (err) {
      console.error("Unexpected error updating usage count:", err);
    }
  }, [user, subscription, supabase, isAuthenticated, incrementAnonymousUsage]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setGeneratedContent("Please enter a main topic");
      return;
    }
    if (!keywords.trim()) {
      setGeneratedContent("Please enter keywords");
      return;
    }
    
    // Check if user has reached limit
    if (usageData.limitReached) {
      setShowLimitModal(true);
      return;
    }

    setIsGenerating(true);

    try {
      // Update usage count first (to prevent abuse)
      await updateUsageCount();
      
      const response = await fetch("http://localhost:3001/api/articles/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          style,
          audience,
          tone,
          length,
          keywords,
          structure,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate content");
      }

      setGeneratedContent(data.response);
    } catch (err) {
      console.error("Error generating content:", err);
      setGeneratedContent(
        "Sorry, there was an error generating your content. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Get content for limit modal based on authentication status
  const getLimitModalContent = () => {
    if (!isAuthenticated) {
      return {
        title: "Free Usage Limit Reached",
        description: (
          <>
            <p>
              You've reached your limit of <strong>{usageData.limit}</strong> free article generations.
            </p>
            <p className="mt-2">
              To continue generating articles, please create an account or log in.
            </p>
          </>
        ),
        primaryAction: {
          text: "Sign Up",
          onClick: () => {
            setShowLimitModal(false);
            router.push('/signup?redirect=/article-writer');
          }
        },
        secondaryAction: {
          text: "Login",
          onClick: () => {
            setShowLimitModal(false);
            router.push('/login?redirect=/article-writer');
          }
        }
      };
    } else {
      return {
        title: "Usage Limit Reached",
        description: (
          <>
            <p>
              You've reached your monthly limit of <strong>{usageData.limit}</strong> article generations.
            </p>
            <p className="mt-2">
              To continue generating articles, please upgrade your subscription plan.
            </p>
          </>
        ),
        primaryAction: {
          text: "View Plans",
          onClick: () => {
            setShowLimitModal(false);
            router.push('/pricing');
          }
        },
        secondaryAction: {
          text: "Cancel",
          onClick: () => setShowLimitModal(false)
        }
      };
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      toast({
        title: "Copied to clipboard",
      });
    } catch (err) {
      console.error("Failed to copy text:", err);
      toast({
        title: "Failed to copy",
        description: "Could not copy text to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `article-${topic || "untitled"}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleSaveDraft = () => {
    setDraftContent(generatedContent);
    toast({
      title: "Draft saved",
      description: "Your content has been saved as a draft",
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGeneratedContent(e.target.value);
  };

  // Show loading state while initializing
  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 container mx-auto px-4 py-8 md:py-12 pt-20">
          <div className="flex items-center justify-center h-[80vh]">
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
              <p className="mt-4 text-muted-foreground">Loading article writer...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Get modal content based on authentication status
  const modalContent = getLimitModalContent();

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 pt-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-8 md:ml-8 gap-4">
          <h1 className="text-xl md:text-2xl font-semibold">Article Writer</h1>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
            {/* Usage indicator */}
            <div className="text-sm text-muted-foreground mr-4 self-center hidden md:block">
              <span className="font-medium">
                {usageData.used} / {usageData.limit === Infinity ? "∞" : usageData.limit} generations used
              </span>
              {!isAuthenticated && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (Free trial)
                </span>
              )}
            </div>
          <Button
            onClick={handleGenerate}
            size="default"
            className="w-full sm:w-auto"
              disabled={!topic.trim() || !keywords.trim() || isGenerating || usageData.limitReached}
          >
            {isGenerating ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin h-4 w-4 mr-2 text-white"
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
                Generating...
              </div>
              ) : usageData.limitReached ? (
                "Limit Reached"
            ) : (
              "Generate Content"
            )}
          </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-auto md:h-[calc(100vh-12rem)] md:ml-8">
          <div className="md:col-span-3 space-y-4 md:space-y-6">
            <Card className="p-4">
              <div className="space-y-4">
                {/* Mobile usage indicator */}
                <div className="text-sm text-muted-foreground mb-2 md:hidden">
                  <span className="font-medium">
                    {usageData.used} / {usageData.limit === Infinity ? "∞" : usageData.limit} generations used
                  </span>
                  {!isAuthenticated && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (Free trial)
                    </span>
                  )}
                </div>
              
                <div className="space-y-2">
                  <Label htmlFor="topic" className="text-sm font-medium">
                    Main Topic *
                  </Label>
                  <Input
                    id="topic"
                    placeholder="What would you like to write about?"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
                    className={!topic.trim() ? "border-red-500" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords" className="text-sm font-medium">
                    Keywords *
                  </Label>
                  <Input
                    id="keywords"
                    placeholder="Enter relevant keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    required
                    className={!keywords.trim() ? "border-red-500" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="structure" className="text-sm font-medium">
                    Article Structure
                  </Label>
                  <Select value={structure} onValueChange={setStructure}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select structure" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="newspaper">Newspaper</SelectItem>
                      <SelectItem value="blog">Blog</SelectItem>
                      <SelectItem value="editorial">Editorial</SelectItem>
                      <SelectItem value="scientific">Scientific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience" className="text-sm font-medium">
                    Target Audience
                  </Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="style" className="text-sm font-medium">
                    Writing Style
                  </Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="informative">Informative</SelectItem>
                      <SelectItem value="persuasive">Persuasive</SelectItem>
                      <SelectItem value="analytical">Analytical</SelectItem>
                      <SelectItem value="storytelling">Storytelling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {!isAuthenticated && (
                  <div className="pt-2 border-t mt-4">
                    <p className="text-xs text-muted-foreground">
                      You're using the free trial ({usageData.used}/{usageData.limit} used). 
                      <Button 
                        variant="link" 
                        className="h-auto p-0 text-xs"
                        onClick={() => router.push('/signup')}
                      >
                        Sign up
                      </Button> for more features.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="md:col-span-9 flex flex-col md:ml-8">
            <Card className="flex-1 flex flex-col">
              <div className="border-b p-2 flex flex-wrap items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  Copy
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  Download
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSaveDraft}>
                  Save Draft
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "Done Editing" : "Edit"}
                </Button>
              </div>

              <div className="flex-1 p-4 md:p-6 overflow-auto">
                {isEditing ? (
                  <Textarea
                    id="output"
                    className="
                      flex-1 resize-none border-0 
                      focus-visible:ring-0 
                      focus-visible:ring-offset-0 
                      whitespace-pre-wrap
                      min-h-[300px] md:min-h-[1000px]
                    "
                    placeholder="Start writing or generate content..."
                    value={generatedContent}
                    onChange={handleContentChange}
                  />
                ) : (
                  <div className="min-h-[300px]">
                    {generatedContent ? (
                       <AnimatedParagraphs text={generatedContent} />
                    ) : (
                      <p className="text-muted-foreground">Generated content will appear here...</p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>

      {isGenerating && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <svg
            className="animate-spin h-10 w-10 text-white"
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
        </div>
      )}
      
      {showLimitModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">{modalContent.title}</h3>
                <button 
                  onClick={() => setShowLimitModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                {modalContent.description}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={modalContent.secondaryAction.onClick}
                >
                  {modalContent.secondaryAction.text}
                </Button>
                <Button 
                  className="flex-1"
                  onClick={modalContent.primaryAction.onClick}
                >
                  {modalContent.primaryAction.text}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
