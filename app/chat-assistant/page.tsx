"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Send, Sparkles, ThumbsUp, ThumbsDown, Copy, Loader2, User } from "lucide-react";
import { AnimatedParagraphs } from "@/components/ui/animated-paragraphs";
import { createClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoints } from '@/lib/config';

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatHistory {
  id: string;
  messages: Message[];
  created_at: string;
  title?: string;
}

export default function ChatAssistant() {
  const router = useRouter();
  const { user, isLoading: authLoading, session } = useAuth(true, '/login');
  const [supabase, setSupabase] = useState<any>(null);

  // Initialize Supabase client on the client side
  useEffect(() => {
    try {
      const client = createClient();
      setSupabase(client);
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
    }
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestionCategory, setSuggestionCategory] = useState<string>("content");
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [usageData, setUsageData] = useState<{
    used: number;
    limit: number;
    limitReached: boolean;
  }>({
    used: 0,
    limit: 0,
    limitReached: false
  });

  const saveChatHistory = useCallback(async (currentMessages: Message[], userId: string, recordId: string | null) => {
    if (!userId || !supabase) return;
    
    let title = "New Chat";
    const firstUserMessage = currentMessages.find(msg => msg.role === "user");
    if (firstUserMessage) {
      title = firstUserMessage.content.split(' ').slice(0, 4).join(' ');
      if (title.length < firstUserMessage.content.length) {
        title += '...';
      }
    }
    
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .upsert({ 
          id: recordId ?? undefined,
          user_id: userId, 
          messages: currentMessages, 
          title: title,
          updated_at: new Date().toISOString()
        }, {
           onConflict: 'id',
        })
        .select('id')
        .single();

      if (error) {
        console.error("Error saving chat history:", error);
      } else if (data && !recordId) {
         setHistoryId(data.id);
         loadChatHistory(userId);
      }
    } catch (err) {
      console.error("Unexpected error saving chat history:", err);
    }
  }, [supabase]);

  const loadChatHistory = useCallback(async (userId: string) => {
    if (!userId || !supabase) return;
    
    try {
      const { data: historyData, error: historyError } = await supabase
        .from('chat_history')
        .select('id, messages, created_at, title')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (historyError) {
        console.error("Error loading chat history:", historyError);
        setChatHistory([]);
      } else if (historyData) {
        const typedData = historyData.map((chat: any) => ({
          id: chat.id,
          messages: Array.isArray(chat.messages) ? chat.messages : [],
          created_at: chat.created_at,
          title: chat.title || "Chat " + new Date(chat.created_at).toLocaleDateString()
        }));
        setChatHistory(typedData);
      }
    } catch (err) {
      console.error("Unexpected error loading chat history:", err);
      setChatHistory([]);
    }
  }, [supabase]);

  useEffect(() => {
    const checkUserAndLoadHistory = async () => {
      // Wait for Supabase client to be initialized and user to be authenticated
      if (!supabase || !user) {
        console.log("Waiting for Supabase client and user authentication...");
        return; // Don't proceed until both are ready
      }

      try {
        const userId = user.id;

        try {
          const { data: historyData, error: historyError } = await supabase
            .from('chat_history')
            .select('id, messages, created_at, title')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (historyError) {
            console.error("Error loading initial chat history:", historyError);
          } else if (historyData?.messages) {
            if (Array.isArray(historyData.messages)) {
              setMessages(historyData.messages);
              setHistoryId(historyData.id);
            }
          }
        } catch (err) {
          console.error("Unexpected error loading initial history:", err);
        } finally {
          setLoadingHistory(false);
        }

        loadChatHistory(userId);
      } catch (error) {
        console.error("Error in checkUserAndLoadHistory:", error);
        router.replace('/login');
        setLoadingHistory(false);
      }
    };

    checkUserAndLoadHistory();
  }, [supabase, router, loadChatHistory, user]);

  useEffect(() => {
    const getSubscription = async () => {
      if (!user || !supabase) return;
      
      try {
        // First check if the user already has a subscription
        // Get all subscriptions for the user, ordered by creation date (newest first)
        const { data: subscriptions, error } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
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
          const isUnlimited = activeSubscription.chat_messages_limit === -1;
          
          setUsageData({
            used: activeSubscription.chat_messages_used || 0,
            limit: isUnlimited ? Infinity : activeSubscription.chat_messages_limit,
            limitReached: !isUnlimited && 
              activeSubscription.chat_messages_used >= activeSubscription.chat_messages_limit
          });
        } else {
          // No subscriptions found, create one
          console.log("No subscription found, creating a default one");
          
          // Use a transaction to avoid creating duplicate subscriptions
          const { data: newSub, error: createError } = await supabase
            .rpc('create_subscription_if_not_exists', {
              user_id_param: user.id,
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
                user_id: user.id,
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
                chat_messages_used: 0,
                chat_messages_limit: 300,
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              });
              
              setUsageData({
                used: 0,
                limit: 300,
                limitReached: false
              });
            } else if (insertResult) {
              console.log("Created new subscription via fallback:", insertResult);
              setSubscription(insertResult);
              
              setUsageData({
                used: 0,
                limit: 300,
                limitReached: false
              });
            }
          } else if (newSub) {
            console.log("Created/retrieved subscription via RPC:", newSub);
            setSubscription(newSub);
            
            setUsageData({
              used: 0,
              limit: 300,
              limitReached: false
            });
          }
        }
      } catch (err) {
        console.error("Unexpected error managing subscription:", err);
        // Fallback to default values
        setSubscription({
          plan_id: 'free',
          status: 'active',
          chat_messages_used: 0,
          chat_messages_limit: 300,
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        setUsageData({
          used: 0,
          limit: 300,
          limitReached: false
        });
      }
    };
    
    getSubscription();
  }, [user, supabase]);

  const allSuggestions = {
    content: [
      "Help me write a blog post about digital marketing trends.",
      "Generate social media content for a product launch.",
      "Create an email campaign for a new service.",
      "Suggest content ideas for increasing engagement.",
    ],
    strategy: [
      "What are effective SEO strategies for a small business?",
      "How can I improve my email open rates?",
      "What marketing metrics should I focus on for my ecommerce store?",
      "Help me create a content calendar for the next quarter.",
    ],
    audience: [
      "How can I better target millennials in my marketing?",
      "What type of content works best for B2B audiences?",
      "Help me develop buyer personas for my product.",
      "What channels are best for reaching Gen Z consumers?",
    ]
  };

  const suggestedPrompts = allSuggestions[suggestionCategory as keyof typeof allSuggestions];

  const rotateSuggestions = () => {
    const categories = Object.keys(allSuggestions);
    const currentIndex = categories.indexOf(suggestionCategory);
    const nextIndex = (currentIndex + 1) % categories.length;
    setSuggestionCategory(categories[nextIndex]);
  };

  const updateUsageCount = useCallback(async () => {
    if (!user || !subscription) return;
    
    // Usage count is now updated on the backend
    // Update local state for UI consistency
    setSubscription((prev: any) => ({
      ...prev,
      chat_messages_used: (prev.chat_messages_used || 0) + 1
    }));

    setUsageData(prev => ({
      ...prev,
      used: prev.used + 1,
      limitReached: prev.limit !== Infinity && prev.used + 1 >= prev.limit
    }));
  }, [user, subscription]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    
    // Check if user has reached limit
    if (usageData.limitReached) {
      setShowLimitModal(true);
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      // Update usage count first (to prevent abuse)
      await updateUsageCount();
      
      const systemInstruction = "You are an expert marketing assistant. Focus on providing actionable marketing strategies, creative content ideas, and professional advice. Be concise, enthusiastic, and solution-oriented. Address the user professionally but with a friendly tone.";
              const response = await fetch(apiEndpoints.chat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: updatedMessages,
          prompt: currentInput,
          systemInstruction,
          userId: user.id
        }),
      });

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response || "No response generated."
      };
      
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      await saveChatHistory(finalMessages, user.id, historyId);

    } catch (error: any) {
      console.error("Error generating chat response:", error);
      const errorMsg: Message = { role: "assistant", content: "Sorry, there was an error generating a response." };
      const messagesWithError = [...updatedMessages, errorMsg];
      setMessages(messagesWithError);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.children[1] as HTMLElement;
      if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  if (loadingHistory && user) {
    return <div className="flex items-center justify-center h-screen">Loading Chat...</div>;
  }

  // Show loading state while authenticating
  if (authLoading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <h3 className="text-lg font-semibold">Initializing Chat Assistant...</h3>
            <p className="text-muted-foreground">Setting up your secure connection</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 flex flex-col overflow-hidden pt-20">
        <div className="container px-4 md:px-6 py-4 md:py-6 flex-1">
          <div className="grid h-[calc(100vh-8rem)] grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] gap-6 overflow-hidden">
            <Card className="flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                 {messages.length === 0 && !isLoading ? (
                    <div className="h-full flex items-center justify-center text-center">
                       <div className="space-y-4">
                         <Sparkles className="h-8 w-8 mx-auto text-primary" />
                         <h3 className="text-xl font-semibold">How can I help you today?</h3>
                         <p className="text-muted-foreground max-w-sm mx-auto">
                           Ask me anything about writing, content creation, or marketing strategies.
                         </p>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`flex gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className={message.role === "assistant" ? "bg-primary/10" : "bg-muted"}>
                                {message.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`rounded-lg p-4 ${
                                message.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              } break-words overflow-hidden`}
                            >
                              {message.role === "assistant" ? (
                                <AnimatedParagraphs text={message.content} />
                              ) : (
                                <p>{message.content}</p>
                              )}

                              {message.role === "assistant" && (
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <Button variant="ghost" size="sm" className="h-6 px-2">
                                    <ThumbsUp className="h-3 w-3 mr-1" />
                                    Helpful
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 px-2">
                                    <ThumbsDown className="h-3 w-3 mr-1" />
                                    Not Helpful
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 px-2">
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {isLoading && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          AI is thinking...
                        </div>
                      )}
                    </div>
                  )}
              </ScrollArea>
              <div className="border-t p-4">
                <div className="flex gap-4">
                  <Textarea
                    placeholder="Ask me anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="min-h-[60px]"
                  />
                  <Button
                    onClick={handleSend}
                    size="icon"
                    className="h-[60px] w-[60px]"
                    disabled={isLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send, Shift + Enter for new line
                </p>
              </div>
            </Card>
            <div className="flex flex-col gap-4 h-full max-w-full overflow-y-auto overflow-x-hidden">
              <Card className="p-4 w-full shrink-0 overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold capitalize">{suggestionCategory} Prompts</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={rotateSuggestions}
                    className="text-xs"
                  >
                    Show More
                  </Button>
                </div>
                <div className="space-y-4 w-full">
                  {suggestedPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start text-sm overflow-hidden text-ellipsis whitespace-normal break-words"
                      onClick={() => setInput(prompt)}
                    >
                      <span className="truncate">{prompt}</span>
                    </Button>
                  ))}
                </div>
              </Card>
              <Card className="p-4 w-full shrink-0 overflow-hidden">
                <h3 className="font-semibold mb-4 truncate">Chat History</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-sm mb-4"
                    onClick={() => {
                      setMessages([]);
                      setHistoryId(null);
                      setInput("");
                    }}
                  >
                    <span className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      New Chat
                    </span>
                  </Button>
                  {chatHistory.map((chat) => (
                    <Button
                      key={chat.id}
                      variant="ghost"
                      className="w-full justify-start text-sm overflow-hidden text-ellipsis whitespace-normal break-words"
                      onClick={() => {
                        if (Array.isArray(chat.messages)) {
                          setMessages(chat.messages);
                          setHistoryId(chat.id);
                        }
                      }}
                    >
                      <div className="flex flex-col items-start w-full">
                        <span className="truncate w-full text-left">
                          {chat.title || chat.messages[0]?.content.substring(0, 30) + "..."}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(chat.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </Button>
                  ))}
                  {chatHistory.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No chat history found
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">Usage Limit Reached</h3>
                <button 
                  onClick={() => setShowLimitModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <p>
                  You've reached your monthly chat message limit of <strong>{usageData.limit}</strong> messages.
                </p>
                <p>
                  To continue using the chat assistant, please upgrade your subscription plan.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowLimitModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setShowLimitModal(false);
                    router.push('/pricing');
                  }}
                >
                  View Plans
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
