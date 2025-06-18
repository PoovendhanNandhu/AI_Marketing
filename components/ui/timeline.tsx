"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Timeline = ({
  items,
  className,
}: {
  items: {
    title: string;
    description: string;
    icon?: React.ReactNode;
  }[];
  className?: string;
}) => {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-[50%] top-0 h-full w-[1px] bg-gradient-to-b from-primary/20 via-primary/50 to-primary/20" />
      <div className="space-y-24">
        {items.map((item, idx) => (
          <TimelineItem
            key={item.title + idx}
            title={item.title}
            description={item.description}
            icon={item.icon}
            inverted={idx % 2 === 0}
          />
        ))}
      </div>
    </div>
  );
};

const TimelineItem = ({
  title,
  description,
  icon,
  inverted,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  inverted?: boolean;
}) => {
  return (
    <div className={cn("flex items-center justify-center", inverted ? "flex-row-reverse" : "")}>
      <div className="flex-1">
        <motion.div
          initial={{ opacity: 0, x: inverted ? 50 : -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className={cn(
            "flex flex-col gap-2 p-6 bg-card rounded-lg border shadow-lg",
            inverted ? "items-start text-left" : "items-end text-right"
          )}
        >
          <h3 className="font-semibold text-xl">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </motion.div>
      </div>
      <div className="relative mx-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
        >
          {icon}
        </motion.div>
      </div>
      <div className="flex-1" />
    </div>
  );
}; 