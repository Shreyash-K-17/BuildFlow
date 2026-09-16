"use client";

import React from "react";
import { AttendanceStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  getAttendanceStatusBadgeVariant,
  getAttendanceStatusLabel,
} from "@/lib/utils";

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
  className?: string;
  dot?: boolean;
}

export function AttendanceStatusBadge({
  status,
  className,
  dot = true,
}: AttendanceStatusBadgeProps) {
  const label = getAttendanceStatusLabel(status);
  const variant = getAttendanceStatusBadgeVariant(status);

  return (
    <Badge variant={variant} dot={dot} className={className}>
      {label}
    </Badge>
  );
}
