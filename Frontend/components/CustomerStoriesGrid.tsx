"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface CustomerStory {
  metric?: string;
  description?: string;
  quote?: string;
  personImageSrc?: string;
  personName?: string;
  personTitle?: string;
  logoSrc: string;
  logoAlt: string;
  caseStudyHref: string;
  bgColor: string;
  textColor: string;
}

export default function CustomerStoriesGrid({
  stories,
}: {
  stories: CustomerStory[];
}) {
  return (
    <section className="w-full py-12 md:py-24 bg-background border-b">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            See What Our <span className="text-primary">Customers Achieve</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Real results from marketing teams leveraging our AI platform.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {stories.map((story, index) => (
            <Link href={story.caseStudyHref} key={index} legacyBehavior>
              <a
                className={`group block rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 h-full ${story.bgColor}`}
              >
                <div className="p-5 md:p-6 flex flex-col justify-between h-full">
                  <div>
                    {story.metric && (
                      <div
                        className={`text-4xl md:text-5xl font-bold ${story.textColor} mb-2`}
                      >
                        {story.metric}
                      </div>
                    )}
                    {story.description && (
                      <p
                        className={`text-base md:text-lg ${story.textColor} mb-4`}
                      >
                        {story.description}
                      </p>
                    )}
                    {story.quote && (
                      <blockquote
                        className={`text-base md:text-lg italic ${story.textColor} mb-4 border-l-4 pl-4 ${story.textColor.replace(
                          "text-",
                          "border-"
                        )} border-opacity-50`}
                      >
                        {story.quote}
                      </blockquote>
                    )}
                    {story.personImageSrc && (
                      <div className="flex items-center gap-3 mb-4">
                        <Image
                          src={story.personImageSrc}
                          alt={`${story.personName} - ${story.personTitle}`}
                          width={48}
                          height={48}
                          className="rounded-full h-12 w-12 object-cover"
                        />
                        <div>
                          <p
                            className={`font-semibold text-sm ${story.textColor}`}
                          >
                            {story.personName}
                          </p>
                          <p
                            className={`text-xs ${story.textColor} opacity-80`}
                          >
                            {story.personTitle}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-auto flex justify-between items-center pt-4">
                    <Image
                      src={story.logoSrc}
                      alt={story.logoAlt}
                      width={100}
                      height={32}
                      className="h-8 object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
                    />
                    <ArrowRight
                      className={`w-6 h-6 ${story.textColor} opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300`}
                    />
                  </div>
                </div>
              </a>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
