'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Download, Sparkles, AlertTriangle, Info, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Progress } from '@/components/ui/progress';

// Types
interface ImageGenOptions {
  size: string;
  style?: string;
  model: string;
  provider: string;
  negativePrompt?: string;
}

interface Model {
  id: string;
  name: string;
  sizes: string[];
  styles: string[];
  defaultSize: string;
}

interface Provider {
  id: string;
  name: string;
  models: Model[];
}

interface UsageStats {
  used: number;
  limit: number;
  isPremium: boolean;
  canGenerate: boolean;
}

export default function ImageGenerator() {
  const router = useRouter();
  const supabase = createClient();
  
  // State for prompt and generation options
  const [prompt, setPrompt] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('create');
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);
  
  // Image generation options
  const [options, setOptions] = useState<ImageGenOptions>({
    size: '1024x1024',
    style: 'photographic',
    model: 'dall-e-3',
    provider: 'openai',
  });
  
  // Available models and options (will be fetched from API)
  const [availableStyles, setAvailableStyles] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  
  // Fetch current user and usage stats
  useEffect(() => {
    const fetchUserAndStats = async () => {
      try {
        setIsLoadingStats(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No authenticated user found');
          setIsLoadingStats(false);
          return;
        }
        
        setUserId(user.id);
        
        // First, check for Stripe subscription and update Supabase if needed
        await checkStripeSubscription(user);
        
        // Then fetch usage stats (this will get the updated limits)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/images/usage/${user.id}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to fetch usage stats:', errorData);
          setIsLoadingStats(false);
          return;
        }
        
        const usageData = await response.json();
        setUsageStats(usageData);
      } catch (error) {
        console.error('Error fetching user or usage stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    fetchUserAndStats();
  }, [supabase]);
  
  // Check if authenticated user has a paid subscription from Stripe
  const checkStripeSubscription = async (user: any) => {
    if (!user) return;
    
    try {
      console.log("Checking Stripe subscription status for user:", user.id);
      // Use the mapped customer ID if available (same as in article writer)
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
            image_generations_limit: -1, // unlimited image generations
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
          
        if (error) {
          console.error("Error updating subscription in Supabase:", error);
        } else {
          console.log("Successfully updated subscription limits to unlimited for image generation");
        }
      }
    } catch (error) {
      console.error("Error checking Stripe subscription:", error);
    }
  };
  
  // Function to refresh usage stats after generation
  const refreshUsageStats = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/images/usage/${userId}`
      );
      
      if (response.ok) {
        const usageData = await response.json();
        setUsageStats(usageData);
      }
    } catch (error) {
      console.error('Error refreshing usage stats:', error);
    }
  };
  
  // Fetch available models and options on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/images/models`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch model data');
        }
        
        const data = await response.json();
        
        // Check if we have the new structure with providers
        if (data.providers && Array.isArray(data.providers)) {
          setAvailableProviders(data.providers);
          
          // Default to the first provider if none selected
          const currentProvider = data.providers.find((p: Provider) => p.id === options.provider) || data.providers[0];
          
          if (currentProvider) {
            // Get the first model of the provider or match current model
            const currentModel = currentProvider.models.find((m: Model) => m.id === options.model) || currentProvider.models[0];
            
            if (currentModel) {
              // Set available styles and sizes based on the selected model
              setAvailableStyles(currentModel.styles || []);
              setAvailableSizes(currentModel.sizes || []);
              setAvailableModels(currentProvider.models);
              
              // Update options with valid selections
              setOptions(prev => ({
                ...prev,
                provider: currentProvider.id,
                model: currentModel.id,
                size: currentModel.sizes.includes(prev.size) ? prev.size : (currentModel.defaultSize || currentModel.sizes[0]),
                style: currentModel.styles.includes(prev.style || '') ? prev.style : undefined
              }));
            }
          }
        } else {
          // Fallback for old API format (just in case)
          if (data.styles) setAvailableStyles(data.styles);
          if (data.sizes) setAvailableSizes(data.sizes);
          if (data.models) {
            setAvailableModels(data.models.map((id: string) => ({ id, name: id, sizes: data.sizes, styles: data.styles })));
          }
        }
      } catch (error) {
        console.error('Failed to fetch image generation models:', error);
        
        // Set default fallback providers and models
        const fallbackProviders = [
          {
            id: 'openai',
            name: 'OpenAI',
            models: [
              { 
                id: 'dall-e-3', 
                name: 'DALL·E 3',
                sizes: ["1024x1024", "1792x1024", "1024x1792"],
                defaultSize: "1024x1024",
                styles: ['photographic', 'digital art', 'pixel art', 'van gogh', 'impressionist', 'surrealist']
              }
            ]
          }
        ];
        
        setAvailableProviders(fallbackProviders);
        setAvailableModels(fallbackProviders[0].models);
        setAvailableStyles(fallbackProviders[0].models[0].styles);
        setAvailableSizes(fallbackProviders[0].models[0].sizes);
        
        setOptions(prev => ({
          ...prev,
          provider: 'openai',
          model: 'dall-e-3',
          size: "1024x1024",
          style: 'photographic'
        }));
      }
    };
    
    fetchModels();
  }, []);
  
  // Handle provider change
  const handleProviderChange = (providerId: string) => {
    const provider = availableProviders.find((p: Provider) => p.id === providerId);
    if (!provider) return;
    
    // Get the first model of the provider
    const firstModel = provider.models[0];
    if (!firstModel) return;
    
    // Update available models
    setAvailableModels(provider.models);
    
    // Update available styles and sizes based on the first model
    setAvailableStyles(firstModel.styles || []);
    setAvailableSizes(firstModel.sizes || []);
    
    // Update options with new provider and model
    setOptions(prev => ({
      ...prev,
      provider: providerId,
      model: firstModel.id,
      size: firstModel.defaultSize || firstModel.sizes[0],
      style: undefined // Reset style as it may not be valid for the new model
    }));
  };
  
  // Handle model change
  const handleModelChange = (modelId: string) => {
    const selectedProvider = availableProviders.find((p: Provider) => p.id === options.provider);
    if (!selectedProvider) return;
    
    const selectedModel = selectedProvider.models.find((m: Model) => m.id === modelId);
    if (!selectedModel) return;
    
    // Update available styles and sizes for this model
    setAvailableStyles(selectedModel.styles || []);
    setAvailableSizes(selectedModel.sizes || []);
    
    // Update options with new model and valid size
    setOptions(prev => ({
      ...prev,
      model: modelId,
      size: selectedModel.sizes.includes(prev.size) ? prev.size : (selectedModel.defaultSize || selectedModel.sizes[0]),
      style: selectedModel.styles.includes(prev.style || '') ? prev.style : undefined
    }));
  };
  
  // Clear error when changing tabs or prompt
  useEffect(() => {
    setError(null);
  }, [prompt, selectedTab]);
  
  // Generate image function
  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt to generate an image');
      return;
    }
    
    // Check if user is authenticated
    if (!userId) {
      toast.error('You must be logged in to generate images');
      router.push('/login');
      return;
    }
    
    // Check usage limits before generating
    if (usageStats && !usageStats.canGenerate) {
      setError(
        usageStats.isPremium 
          ? `You've reached your limit of ${usageStats.limit} image generations for this billing period.`
          : `You've reached your free limit of ${usageStats.limit} image generations. Upgrade for more!`
      );
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/images/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          provider: options.provider,
          modelId: options.model,
          size: options.size,
          style: options.style,
          negativePrompt: negativePrompt || undefined,
          userId: userId
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.details || data.error || 'Failed to generate image';
        
        // Special handling for usage limit errors
        if (data.error === 'Usage limit reached') {
          const details = data.details;
          setError(
            details.isPremium 
              ? `You've reached your limit of ${details.limit} image generations for this billing period.`
              : `You've reached your free limit of ${details.limit} image generations. Upgrade for more!`
          );
          
          // Update usage stats
          if (usageStats) {
            setUsageStats({
              ...usageStats,
              used: details.used,
              canGenerate: false
            });
          }
        } else {
          setError(errorMessage);
        }
        
        throw new Error(errorMessage);
      }
      
      if (data.images && data.images.length > 0) {
        setGeneratedImages(data.images);
        setSelectedTab('results');
        toast.success('Image generated successfully!');
        
        // Refresh usage stats from server to get accurate updated counts
        await refreshUsageStats();
      } else {
        setError('No images were generated. Try a different prompt or style.');
        toast.error('No images were generated. Try a different prompt.');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Download image function
  const downloadImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error('Failed to download image');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url); // Clean up
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  };
  
  const handlePromptKeyDown = (e: React.KeyboardEvent) => {
    // Generate image on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      generateImage();
    }
  };
  
  // Handle upgrade click
  const handleUpgradeClick = () => {
    router.push('/pricing');
  };
  
  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">AI Image Generation</h1>
      
      {usageStats && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Images used: {usageStats.used} of {usageStats.limit === -1 ? 'Unlimited' : usageStats.limit}
                </span>
                {!usageStats.isPremium && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpgradeClick}
                  >
                    Upgrade
                  </Button>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                  style={{ 
                    width: `${usageStats.limit === -1 ? 0 : Math.min((usageStats.used / usageStats.limit) * 100, 100)}%` 
                  }}
                ></div>
              </div>
              {usageStats.limit !== -1 && usageStats.used >= usageStats.limit - 1 && (
                <Alert variant="default" className="mt-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {usageStats.isPremium
                      ? `You have ${Math.max(0, usageStats.limit - usageStats.used)} image generations left this billing cycle.`
                      : `You're almost out of free generations. Upgrade for more!`}
                  </AlertDescription>
                </Alert>
              )}
              {usageStats.limit === -1 && (
                <Alert variant="default" className="mt-2 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-300">
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    You have unlimited image generations with your premium subscription!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="create">Create</TabsTrigger>
          <TabsTrigger value="results" disabled={generatedImages.length === 0}>
            Results
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Your Image</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="prompt" className="text-lg font-semibold">Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe the image you want to generate (e.g., 'A futuristic cityscape at sunset, cyberpunk style')"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handlePromptKeyDown}
                    className="h-28 resize-none mt-1 text-base"
                  />
                  <p className="text-xs text-gray-500 mt-1">Describe what you want to see. Be as specific or creative as you like! Press Ctrl+Enter or Cmd+Enter to generate.</p>
                </div>
                
                <Card className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                  <CardHeader className="p-0 mb-3">
                      <CardTitle className="text-md flex items-center"><Settings2 className="w-4 h-4 mr-2" /> Fine-tune Your Image</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <div>
                      <Label htmlFor="negative-prompt">Negative Prompt (Optional)</Label>
                      <Textarea
                        id="negative-prompt"
                        placeholder="Elements to exclude (e.g., 'text, watermarks, blurry')"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        className="h-20 resize-none mt-1"
                      />
                    </div>
                  
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="provider">Provider</Label>
                        <Select
                          value={options.provider}
                          onValueChange={handleProviderChange}
                        >
                          <SelectTrigger id="provider">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProviders.map((provider) => (
                              <SelectItem key={provider.id} value={provider.id}>
                                {provider.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="model">Model</Label>
                        <Select
                          value={options.model}
                          onValueChange={handleModelChange}
                        >
                          <SelectTrigger id="model">
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModels.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="style">Style (Optional)</Label>
                        <Select
                          value={options.style}
                          onValueChange={(value) => setOptions({...options, style: value})}
                        >
                          <SelectTrigger id="style">
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableStyles.map((styleName) => (
                              <SelectItem key={styleName} value={styleName}>
                                {styleName.charAt(0).toUpperCase() + styleName.slice(1).replace('-', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="size">Size</Label>
                        <Select
                          value={options.size}
                          onValueChange={(value) => setOptions({...options, size: value})}
                        >
                          <SelectTrigger id="size">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSizes.map((sizeOption) => (
                              <SelectItem key={sizeOption} value={sizeOption}>{sizeOption}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                    {error.includes('limit') && !usageStats?.isPremium && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={handleUpgradeClick}
                      >
                        Upgrade for More Images
                      </Button>
                    )}
                  </Alert>
                )}
                
                <Button 
                  onClick={generateImage} 
                  disabled={isGenerating || !prompt.trim() || !!(usageStats && !usageStats.canGenerate)} 
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Image
                    </>
                  )}
                </Button>
                
                {!isGenerating && usageStats && !usageStats.canGenerate && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={handleUpgradeClick}
                  >
                    Upgrade for More Images
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="space-y-6">
          <div className="flex flex-col items-center justify-center">
            {generatedImages.map((imageUrl, index) => (
              <Card key={index} className="overflow-hidden mb-8 max-w-2xl w-full">
                <CardContent className="p-0">
                  <div className="relative group">
                    <img 
                      src={imageUrl} 
                      alt={`Generated image ${index + 1}`} 
                      className="w-full h-auto object-contain"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => downloadImage(imageUrl, index)}
                        className="bg-white hover:bg-gray-100"
                      >
                        <Download className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-center mt-6">
            <Button 
              onClick={() => setSelectedTab('create')} 
              className="max-w-md w-full"
              size="lg"
            >
              Generate Another Image
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 