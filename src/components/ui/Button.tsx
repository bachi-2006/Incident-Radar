"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-45 disabled:pointer-events-none active:scale-[0.98]";

    const variants = {
      primary:
        "bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-900/30",
      secondary:
        "bg-[#18181d] hover:bg-zinc-800 text-zinc-200 border border-[#27272a] hover:border-zinc-600",
      ghost: "hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-200",
      danger:
        "bg-red-600/90 hover:bg-red-500 text-white shadow-sm shadow-red-900/20",
      outline:
        "border border-[#27272a] hover:border-zinc-600 text-zinc-300 hover:bg-zinc-900/60",
    };

    const sizes = {
      sm: "h-8 px-2.5 text-[12px]",
      md: "h-9 px-3.5 text-[13px]",
      lg: "h-10 px-4 text-sm",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
