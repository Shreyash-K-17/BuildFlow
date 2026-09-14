import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  supportingText?: string;
  icon: React.ReactNode;
  variant?: "default" | "amber" | "emerald" | "danger" | "sky";
  badge?: string;
  badgeVariant?: "default" | "amber" | "warning" | "success" | "danger" | "info" | "secondary";
  className?: string;
}

export function KPICard({
  title,
  value,
  supportingText,
  icon,
  variant = "default",
  badge,
  badgeVariant = "secondary",
  className,
}: KPICardProps) {
  const iconVariants = {
    default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    danger: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20",
    sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20",
  };

  return (
    <Card hoverEffect className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-colors", iconVariants[variant])}>
            {icon}
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
            {value}
          </div>
          {badge && (
            <Badge variant={badgeVariant} className="shrink-0 text-[10px]">
              {badge}
            </Badge>
          )}
        </div>

        {supportingText && (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            {supportingText}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
