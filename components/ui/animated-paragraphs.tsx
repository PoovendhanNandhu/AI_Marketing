"use client";

import { motion, Variants } from "framer-motion";

// Component to animate paragraphs sequentially
export function AnimatedParagraphs({ text = "" }: { text?: string }) {
  // Split text on one or more blank lines
  const paragraphs = text.split(/\n\s*\n/);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.3 }, // Stagger delay between paragraphs
    },
  };

  const paragraphVariants = {
    hidden: { opacity: 0, y: 20 }, // Start slightly down and invisible
    visible: {
      opacity: 1,
      y: 0, // Animate to original position and fully visible
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      key={text} // Force re-animation when text changes
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 whitespace-pre-wrap"
    >
      {paragraphs.map((para, idx) => (
        <motion.p key={idx} variants={paragraphVariants as Variants}>
          {para}
        </motion.p>
      ))}
    </motion.div>
  );
} 
