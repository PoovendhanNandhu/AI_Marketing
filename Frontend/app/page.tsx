"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pen, MessageSquare, AppWindow, Target, Presentation, Lightbulb, TrendingUp, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal"
import HomeIntro from "@/components/HomeIntro"
import CustomerStoriesGrid from "@/components/CustomerStoriesGrid"
import Image from "next/image"
import { motion } from "motion/react"
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight"
import React from 'react'

const stickyContent = [
  {
    title: "AI-Powered Writing",
    description:
      "Experience the power of AI to generate high-quality content in seconds. From blog posts to marketing copy, our AI understands your needs and delivers compelling results.",
    content: (
      <div className="h-full w-full bg-[linear-gradient(to_bottom_right,var(--cyan-500),var(--emerald-500))] flex items-center justify-center text-white p-4">
        <Image
          src="/writing-demo.png"
          alt="AI Writing Demo"
          width={500}
          height={300}
          className="object-cover rounded-lg shadow-2xl max-w-full h-auto"
        />
      </div>
    ),
  },
  {
    title: "Smart Templates",
    description:
      "Choose from a variety of professionally designed templates or create your own. Our smart system learns from your preferences to suggest the best formats for your content.",
    content: (
      <div className="h-full w-full bg-[linear-gradient(to_bottom_right,var(--pink-500),var(--indigo-500))] flex items-center justify-center text-white p-4">
        <Image
          src="/templates-demo.png"
          alt="Templates Demo"
          width={500}
          height={300}
          className="object-cover rounded-lg shadow-2xl max-w-full h-auto"
        />
      </div>
    ),
  },
  {
    title: "Collaboration Tools",
    description:
      "Work together seamlessly with your team. Share drafts, get feedback, and manage revisions all in one place. Real-time collaboration makes content creation a breeze.",
    content: (
      <div className="h-full w-full bg-[linear-gradient(to_bottom_right,var(--orange-500),var(--yellow-500))] flex items-center justify-center text-white p-4">
        <Image
          src="/collab-demo.png"
          alt="Collaboration Demo"
          width={500}
          height={300}
          className="object-cover rounded-lg shadow-2xl max-w-full h-auto"
        />
      </div>
    ),
  },
]

export default function Home() {
  // Define logos array with example companies
  const logos = [
    { src: "/logos/google.svg", alt: "Google" },
    { src: "/logos/microsoft.svg", alt: "Microsoft" },
    { src: "/logos/airbnb.svg", alt: "Airbnb" },
    { src: "/logos/netflix.svg", alt: "Netflix" },
    { src: "/logos/facebook.svg", alt: "Facebook" },
    { src: "/logos/uber.svg", alt: "Uber" },
    // Add or replace logos as needed.
  ];

  // Duplicate logos for infinite scroll effect
  const duplicatedLogos = React.useMemo(() => [...logos, ...logos], [logos]);

  // Define data for Customer Stories
  const customerStories = [
    {
      metric: "40%",
      description: "increase in traffic using Jasper to produce better blog content",
      logoSrc: "/logos/google.svg", // Changed from missing file to existing one
      logoAlt: "Customer A",
      caseStudyHref: "/case-studies/customer-a",
      bgColor: "bg-green-100/50 dark:bg-green-900/30", // Example background
      textColor: "text-green-800 dark:text-green-200"
    },
    {
      metric: "3000+",
      description: "hours saved in content creation time",
      logoSrc: "/logos/microsoft.svg", // Changed to existing logo
      logoAlt: "WalkMe",
      caseStudyHref: "/case-studies/walkme",
      bgColor: "bg-purple-100/50 dark:bg-purple-900/30",
      textColor: "text-purple-800 dark:text-purple-200"
    },
    {
      quote: "\"We can be way more creative in what we're putting out into the world\"",
      personImageSrc: "/logo.png", // Changed to existing file
      personName: "Dara Cohen",
      personTitle: "Sr. Manager, Campaign Strategy",
      logoSrc: "/logos/netflix.svg", // Changed from missing file to existing one
      logoAlt: "CloudBees",
      caseStudyHref: "/case-studies/cloudbees",
      bgColor: "bg-white dark:bg-zinc-800/50",
      textColor: "text-gray-700 dark:text-gray-300"
    },
    {
      metric: "800%",
      description: "surge in web traffic",
      logoSrc: "/logos/airbnb.svg", // Changed from missing file to existing one
      logoAlt: "BestPlaces",
      caseStudyHref: "/case-studies/bestplaces",
      bgColor: "bg-orange-100/40 dark:bg-orange-900/30",
      textColor: "text-orange-800 dark:text-orange-200"
    },
    // Add more stories as needed
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* hero section */}
        <section className="w-full">
          <HeroHighlight containerClassName="border-b">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                ease: "easeOut",
              }}
              className="max-w-[64rem] flex flex-col items-center gap-6 md:gap-8 text-center"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                Your <Highlight>AI-Powered</Highlight> Writing Assistant
              </h1>
              <p className="max-w-[30rem] leading-normal text-muted-foreground text-base sm:text-lg md:text-xl">
                Elevate your team, your brand, and your impact with AI that's built for marketing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/article-writer">Start Writing</Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  View Demo
                </Button>
              </div>
            </motion.div>
          </HeroHighlight>
        </section>

        <HomeIntro />

        {/* Companies Section */}
        {/* <section className="py-12 md:py-16 bg-background border-b">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ duration: 0.5 }}
              className="text-center text-lg md:text-xl text-muted-foreground mb-8 md:mb-12 font-medium"
            >
              Trusted by world-class marketing teams
            </motion.h2> */}
            {/* Marquee container */}
            {/* <div className="w-full overflow-hidden">
              <motion.div
                className="flex items-center gap-x-8 md:gap-x-12 lg:gap-x-16 py-4"
                animate={{
                  x: ['0%', '-50%'], 
                }}
                transition={{
                  ease: 'linear',
                  duration: 20,
                  repeat: Infinity,
                }}
              >
                {duplicatedLogos.map((logo, index) => (
                  <motion.div
                    key={index}
                    className="flex-shrink-0"
                  >
                    <Image
                      src={logo.src}
                      alt={logo.alt}
                      width={128}
                      height={40}
                      className="h-10 md:h-12 w-32 md:w-40 object-contain filter grayscale hover:grayscale-0 transition-all duration-200"
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section> */}
        {/* End Companies Section */}

        <CustomerStoriesGrid stories={customerStories} />

        <section className="w-full py-12 md:py-24 bg-background">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <StickyScroll content={stickyContent} />
          </div>
        </section>

        <section className="flex justify-center py-12 md:py-20 lg:py-24 px-4 md:px-6">
          <div className="max-w-6xl w-full">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
                Everything you need for content creation
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground">
                Powerful tools to help you create amazing content
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              <div className="group relative overflow-hidden rounded-3xl border bg-card p-6 md:p-8 hover:shadow-lg transition-all duration-300">
                <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-gradient-to-br from-primary/20 to-primary/5 rounded-bl-[100px] transition-all duration-300 group-hover:scale-110" />
                <div className="relative z-10">
                  <div className="mb-4 md:mb-6">
                    <div className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-3">
                      <Pen className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold mb-2 md:mb-3">Long-form Content</h3>
                  <p className="text-muted-foreground text-sm md:text-base mb-6 md:mb-8">
                    Write blog posts, articles, and website copy that engages your audience
                  </p>
                  <Button className="w-full" variant="outline" size="lg" asChild>
                    <Link href="/article-writer">Start Writing</Link>
                  </Button>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-3xl border bg-card p-6 md:p-8 hover:shadow-lg transition-all duration-300">
                <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-bl-[100px] transition-all duration-300 group-hover:scale-110" />
                <div className="relative z-10">
                  <div className="mb-4 md:mb-6">
                    <div className="inline-flex items-center justify-center rounded-2xl bg-blue-500/10 p-3">
                      <MessageSquare className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold mb-2 md:mb-3">Chat Assistant</h3>
                  <p className="text-muted-foreground text-sm md:text-base mb-6 md:mb-8">
                    Get instant writing suggestions, improvements, and answers
                  </p>
                  <Button className="w-full" variant="outline" size="lg" asChild>
                    <Link href="/chat-assistant">Start Chatting</Link>
                  </Button>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-3xl border bg-card p-6 md:p-8 hover:shadow-lg transition-all duration-300">
                <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-bl-[100px] transition-all duration-300 group-hover:scale-110" />
                <div className="relative z-10">
                  <div className="mb-4 md:mb-6">
                    <div className="inline-flex items-center justify-center rounded-2xl bg-purple-500/10 p-3">
                      <AppWindow className="h-6 w-6 md:h-8 md:w-8 text-purple-500" />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold mb-2 md:mb-3">AI Apps</h3>
                  <p className="text-muted-foreground text-sm md:text-base mb-6 md:mb-8">
                    Explore specialized AI tools for summarization, translation, and more.
                  </p>
                  <Button className="w-full" variant="outline" size="lg" asChild>
                    <Link href="/ai-apps">Explore Apps</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}