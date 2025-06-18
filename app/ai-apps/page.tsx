import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image as ImageIcon, Video, Smile, Zap } from 'lucide-react';

const aiApps = [
  {
    icon: ImageIcon,
    title: 'Image Generation',
    description: 'Create stunning visuals and graphics from text prompts.',
    href: '/ai-apps/image-generator', // Placeholder link
  },
  {
    icon: Video,
    title: 'Video Generation',
    description: 'Produce short videos or animations for marketing or content.',
    href: '/ai-apps/video-generator', // Placeholder link
  },
  {
    icon: Zap,
    title: 'InstaVibe',
    description: 'Automate your business profile setup, post scheduling, and audience engagement using AI and official Instagram APIs.',
    href: '/ai-apps/insta-vibe',
  },  
  {
    icon: Smile,
    title: 'Meme Edit AI',
    description: 'Generate or edit memes quickly with AI assistance.',
    href: '/ai-apps/meme-editor', // Placeholder link
  },
  // Add more apps here if needed

];

export default function AiAppsPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16 pt-20">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Explore AI Apps</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover specialized AI tools to boost your productivity and creativity beyond standard content generation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {aiApps.map((app) => {
          const Icon = app.icon;
          return (
            <Card key={app.title} className="flex flex-col overflow-hidden h-full hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center gap-4 p-4 md:p-6 bg-muted/30">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Icon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-xl font-semibold">{app.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between p-4 md:p-6">
                <p className="text-muted-foreground text-sm md:text-base mb-6">
                  {app.description}
                </p>
                <Button variant="outline" className="w-full mt-auto" asChild>
                  <a href={app.href}>Launch App</a>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

