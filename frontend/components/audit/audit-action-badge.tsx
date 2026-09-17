import React from "react";
import { Badge } from "@/components/ui/badge";

interface AuditActionBadgeProps {
  action: string;
  className?: string;
}

interface AuditEntityBadgeProps {
  entityType: string;
  className?: string;
}

export function AuditActionBadge({ action, className }: AuditActionBadgeProps) {
  const norm = action.trim().toLowerCase();

  let variant: "success" | "info" | "danger" | "warning" | "default" = "default";
  let label = action.toUpperCase();

  if (norm === "create" || norm === "insert" || norm === "add") {
    variant = "success";
    label = "CREATE";
  } else if (norm === "update" || norm === "edit" || norm === "modify") {
    variant = "info";
    label = "UPDATE";
  } else if (norm === "delete" || norm === "remove") {
    variant = "danger";
    label = "DELETE";
  } else if (norm === "deactivate" || norm === "disable") {
    variant = "warning";
    label = "DEACTIVATE";
  }

  return (
    <Badge variant={variant} className={className} dot={variant === "success" || variant === "warning"}>
      {label}
    </Badge>
  );
}

export function AuditEntityBadge({ entityType, className }: AuditEntityBadgeProps) {
  const norm = entityType.trim().toLowerCase();

  let label = entityType.replace(/_/g, " ").toUpperCase();
  let variant: "default" | "secondary" | "amber" | "info" | "success" | "warning" = "default";

  if (norm.includes("project")) {
    variant = "amber";
    label = "PROJECT";
  } else if (norm.includes("task")) {
    variant = "info";
    label = "TASK";
  } else if (norm.includes("worker") || norm.includes("user")) {
    variant = "info";
    label = "WORKER";
  } else if (norm.includes("attendance")) {
    variant = "secondary";
    label = "ATTENDANCE";
  } else if (norm.includes("inventory") || norm.includes("transaction")) {
    variant = "warning";
    label = "INVENTORY";
  } else if (norm.includes("material")) {
    variant = "success";
    label = "MATERIAL";
  } else if (norm.includes("expense") || norm.includes("finance")) {
    variant = "amber";
    label = "EXPENSE";
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
