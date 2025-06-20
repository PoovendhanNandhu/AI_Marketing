"use client";
import { cn } from "@/lib/utils";
import { IconMenu2, IconX } from "@tabler/icons-react";
import {
  motion,
  AnimatePresence,
} from "motion/react";
import Link from "next/link";
import React, { useRef, useState } from "react";
import Image from "next/image";
import { Slot } from '@radix-ui/react-slot';

interface NavbarProps {
  children: React.ReactNode;
  className?: string;
  shouldHide?: boolean;
  visible?: boolean | undefined;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean | undefined;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
  onItemClick?: () => void;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean | undefined;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavToggleProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

interface NavbarButtonProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
  asChild?: boolean;
  visible?: boolean;
  variant?: "primary" | "secondary" | "dark" | "gradient";
  onClick?: () => void;
  as?: React.ElementType;
  title?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Navbar = ({ children, className, shouldHide, visible }: NavbarProps) => {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      animate={{ y: shouldHide ? "-100%" : 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn("sticky inset-x-0 top-0 z-40 w-full", className)}
      data-visible={visible ? "true" : "false"}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible },
            )
          : child,
      )}
    </motion.div>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(10px)" : "none",
        boxShadow: visible
          ? "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset"
          : "none",
        width: visible ? "40%" : "100%",
        y: visible ? 20 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 50,
      }}
      style={{
        minWidth: "800px",
      }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between self-start rounded-full bg-transparent px-4 py-2 lg:flex dark:bg-transparent",
        visible && "bg-white/80 dark:bg-neutral-950/80",
        className,
      )}
      data-visible={visible ? "true" : "false"}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible: visible },
            )
          : child,
      )}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium text-zinc-600 transition duration-200 hover:text-zinc-800 lg:flex lg:space-x-2",
        className,
      )}
    >
      {items.map((item, idx) => (
        <Link
          onMouseEnter={() => setHovered(idx)}
          onClick={onItemClick}
          className="relative px-4 py-2 text-neutral-600 dark:text-neutral-300"
          key={`link-${idx}`}
          href={item.link}
        >
          {hovered === idx && (
            <motion.div
              layoutId="hovered"
              className="absolute inset-0 h-full w-full rounded-full bg-gray-100 dark:bg-neutral-800"
            />
          )}
          <span className="relative z-20">{item.name}</span>
        </Link>
      ))}
    </motion.div>
  );
};

export const NavbarButton = ({ 
  children, 
  className, 
  href, 
  asChild, 
  visible,
  variant = "primary",
  onClick,
  as: Tag = "a",
  title
}: NavbarButtonProps) => {
  const Comp = asChild ? Slot : Tag;
  
  const baseStyles = "relative z-10 flex h-9 items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all";
  
  const variantStyles = {
    primary: "bg-gradient-to-b from-neutral-800 to-neutral-900 text-white shadow-button hover:shadow-button-hover dark:bg-gradient-to-b dark:from-neutral-100 dark:to-neutral-300 dark:text-black px-4",
    secondary: "bg-transparent text-black dark:text-white",
    dark: "bg-black text-white shadow-button hover:shadow-button-hover px-4",
    gradient: "bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-4"
  };

  // If href is provided, use Link component
  if (href) {
    return (
      <div className="relative">
        <Link
          href={href}
          className={cn(
            baseStyles,
            variantStyles[variant],
            className,
          )}
          title={title}
        >
          {children}
        </Link>
      </div>
    );
  }

  // If onClick is provided, use button element
  if (onClick) {
    return (
      <div className="relative">
        <button
          onClick={onClick}
          className={cn(
            baseStyles,
            variantStyles[variant],
            className,
          )}
          title={title}
        >
          {children}
        </button>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="relative">
      <div
        className={cn(
          baseStyles,
          variantStyles[variant],
          className,
        )}
        title={title}
      >
        {children}
      </div>
    </div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(10px)" : "none",
        boxShadow: visible
          ? "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset"
          : "none",
        width: visible ? "90%" : "100%",
        paddingRight: visible ? "12px" : "0px",
        paddingLeft: visible ? "12px" : "0px",
        borderRadius: visible ? "9999px" : "0rem",
        y: visible ? 20 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 50,
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between bg-transparent px-0 py-2 lg:hidden",
        visible && "bg-white/80 dark:bg-neutral-950/80",
        className,
      )}
      data-visible={visible ? "true" : "false"}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
  onClose,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start justify-start gap-4 rounded-lg bg-white px-4 py-8 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] dark:bg-neutral-950",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
  className,
}: MobileNavToggleProps) => {
  return (
    <button
      aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      className={cn(
        "z-10 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-black dark:bg-neutral-800 dark:text-white",
        className,
      )}
      onClick={onClick}
    >
      {isOpen ? (
        <IconX className="h-4 w-4" />
  ) : (
        <IconMenu2 className="h-4 w-4" />
      )}
    </button>
  );
};

export const NavbarLogo = () => {
  return (
    <Link
      href="/"
      className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-black"
    >
      <Image
        src="/logo.png"
        alt="logo"
        width={30}
        height={30}
      />
      <span className="font-medium text-black dark:text-white">YourBrand</span>
    </Link>
  );
}; 