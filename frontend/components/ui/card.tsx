import React from "react";
import { cn } from "@/lib/utils";

export type CardHoverVariant =
  | boolean
  | "none"
  | "default"
  | "amber"
  | "blue"
  | "green"
  | "red"
  | "interactive";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: CardHoverVariant;
}

export function Card({ className, hoverEffect = false, ...props }: CardProps) {
  const getHoverClass = () => {
    if (!hoverEffect || hoverEffect === "none") return "";
    if (hoverEffect === true || hoverEffect === "default") return "buildflow-hover-card";
    if (hoverEffect === "amber") return "buildflow-hover-card-amber";
    if (hoverEffect === "blue") return "buildflow-hover-card-blue";
    if (hoverEffect === "green") return "buildflow-hover-card-green";
    if (hoverEffect === "red") return "buildflow-hover-card-red";
    if (hoverEffect === "interactive")
      return "buildflow-hover-card buildflow-hover-card-interactive";
    return "buildflow-hover-card";
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm",
        getHoverClass(),
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-semibold text-lg tracking-tight text-slate-900 dark:text-slate-100",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-slate-500 dark:text-slate-400", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("p-5 pt-0 sm:p-6 sm:pt-0 text-slate-700 dark:text-slate-300", className)}
      {...props}
    />
  );
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center p-5 pt-0 sm:p-6 sm:pt-0 border-t border-slate-100 dark:border-slate-800/60 mt-4",
        className
      )}
      {...props}
    />
  );
}
