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
      "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
    warning:
      "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
    success:
      "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
    danger:
      "bg-red-50 text-red-800 border-red-200/80 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
    info:
      "bg-sky-50 text-sky-800 border-sky-200/80 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30",
    secondary:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700/60",
    outline:
      "bg-transparent text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  };

  const dotColors = {
    default: "bg-slate-500 dark:bg-slate-400",
    amber: "bg-amber-500 dark:bg-amber-400",
    warning: "bg-amber-500 dark:bg-amber-400",
    success: "bg-emerald-500 dark:bg-emerald-400",
    danger: "bg-red-500 dark:bg-red-400",
    info: "bg-sky-500 dark:bg-sky-400",
    secondary: "bg-slate-500 dark:bg-slate-400",
    outline: "bg-slate-500 dark:bg-slate-400",
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
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}
