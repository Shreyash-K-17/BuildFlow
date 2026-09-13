import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "amber"
    | "warning"
    | "success"
    | "danger"
    | "info"
    | "secondary"
    | "outline";
  dot?: boolean;
}

export function Badge({
  className,
  variant = "default",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default:
      "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    amber:
      "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    warning:
      "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    success:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    danger:
      "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
    info: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
    secondary:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700/60",
    outline:
      "bg-transparent text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  };

  const dotColors = {
    default: "bg-slate-500",
    amber: "bg-amber-500",
    warning: "bg-amber-500",
    success: "bg-emerald-500",
    danger: "bg-red-500",
    info: "bg-sky-500",
    secondary: "bg-slate-400",
    outline: "bg-slate-500",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}
