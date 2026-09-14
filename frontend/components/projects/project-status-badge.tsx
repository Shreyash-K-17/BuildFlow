import React from "react";
import { ProjectStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn, getProjectStatusLabel } from "@/lib/utils";

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  size?: "sm" | "md";
  className?: string;
}

export function ProjectStatusBadge({
  status,
  size = "md",
  className,
}: ProjectStatusBadgeProps) {
  const getVariant = (
    s: ProjectStatus
  ): "warning" | "success" | "secondary" | "info" | "danger" => {
    switch (s) {
      case "active":
        return "success";
      case "planning":
        return "warning";
      case "on_hold":
        return "secondary";
      case "completed":
        return "info";
      case "cancelled":
        return "danger";
      default:
        return "secondary";
    }
  };

  const sizeClasses = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <Badge
      variant={getVariant(status)}
      dot
      className={cn(sizeClasses, className)}
    >
      {getProjectStatusLabel(status)}
    </Badge>
  );
}
