// pages/image-generation.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Download, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

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
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Types
interface ImageGenOptions {
  size: string;
  style?: string;
  negativePrompt?: string;
}

export default function ImageGeneration() {
  const router = useRouter();
  
  // State for prompt and generation options
  const [prompt, setPrompt] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('create');
  const [error, setError] = useState<string | null>(null);
  
  // Image generation options
  const [options, setOptions] = useState<ImageGenOptions>({
    size: '1024x1024',
    style: 'photographic',
  });
  
  // Available models and options (will be fetched from API)
  const [availableStyles, setAvailableStyles] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  
  // Fetch available models and options on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/images/models`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch model data');
        }
        
        const data = await response.json();
        
        if (data.styles) setAvailableStyles(data.styles);
        if (data.sizes) setAvailableSizes(data.sizes);
      } catch (error) {
        console.error('Failed to fetch image generation models:', error);
        // Set default values if API fails
        setAvailableStyles(['photographic', 'digital-art', 'anime', 'painterly']);
        setAvailableSizes(['1024x1024', '1024x768', '768x1024']);
      }
    };
    
    fetchModels();
  }, []);
  
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
          size: options.size,
          style: options.style,
          negativePrompt: negativePrompt || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.details || data.error || 'Failed to generate image';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
      
      if (data.images && data.images.length > 0) {
        setGeneratedImages(data.images);
        setSelectedTab('results');
        toast.success('Image generated successfully!');
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
  
  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">AI Image Generation</h1>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="create">Create</TabsTrigger>
          <TabsTrigger value="results" disabled={generatedImages.length === 0}>
            Results
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="prompt">Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe the image you want to generate..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handlePromptKeyDown}
                    className="h-24 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Press Ctrl+Enter or Cmd+Enter to generate</p>
                </div>
                
                <div>
                  <Label htmlFor="negative-prompt">Negative Prompt (Optional)</Label>
                  <Textarea
                    id="negative-prompt"
                    placeholder="Elements you want to exclude from the image..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    className="h-16 resize-none"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="style">Style</Label>
                    <Select
                      value={options.style}
                      onValueChange={(value) => setOptions({...options, style: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStyles.map((style) => (
                          <SelectItem key={style} value={style}>
                            {style.charAt(0).toUpperCase() + style.slice(1).replace('-', ' ')}
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSizes.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  onClick={generateImage} 
                  disabled={isGenerating || !prompt.trim()} 
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {generatedImages.map((imageUrl, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative group">
                    <img 
                      src={imageUrl} 
                      alt={`Generated image ${index + 1}`} 
                      className="w-full h-auto object-cover"
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
          
          <Button onClick={() => setSelectedTab('create')} className="w-full">
            Generate Another Image
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
  