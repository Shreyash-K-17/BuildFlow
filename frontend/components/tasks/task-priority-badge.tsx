"use client";

import React from "react";
import { TaskPriority } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn, getTaskPriorityBadgeVariant } from "@/lib/utils";

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export function TaskPriorityBadge({
  priority,
  className,
}: TaskPriorityBadgeProps) {
  const label = PRIORITY_LABELS[priority] || priority;
  const variant = getTaskPriorityBadgeVariant(priority);

  return (
    <Badge
      variant={variant}
      className={cn(
        "text-[10px] font-normal px-2 py-0 border-opacity-40 opacity-85",
        className
      )}
    >
      {label}
    </Badge>
  );
}
