"use client";

import React from "react";
import { TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { getTaskStatusBadgeVariant, getTaskStatusLabel } from "@/lib/utils";

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
  dot?: boolean;
}

export function TaskStatusBadge({
  status,
  className,
  dot = true,
}: TaskStatusBadgeProps) {
  const label = getTaskStatusLabel(status);
  const variant = getTaskStatusBadgeVariant(status);

  return (
    <Badge variant={variant} dot={dot} className={className}>
      {label}
    </Badge>
  );
}
