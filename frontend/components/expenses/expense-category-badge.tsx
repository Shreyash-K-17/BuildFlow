import React from "react";
import { Badge } from "@/components/ui/badge";

interface ExpenseCategoryBadgeProps {
  category: string;
  className?: string;
}

export function getExpenseCategoryVariant(category: string): "default" | "secondary" | "success" | "warning" | "danger" | "info" | "amber" | "outline" {
  const norm = category.trim().toLowerCase();
  if (norm.includes("material")) return "success";
  if (norm.includes("labor") || norm.includes("workforce") || norm.includes("wage")) return "info";
  if (norm.includes("equipment") || norm.includes("machinery")) return "amber";
  if (norm.includes("subcontract")) return "secondary";
  if (norm.includes("permit") || norm.includes("license") || norm.includes("legal")) return "secondary";
  if (norm.includes("utilit") || norm.includes("fuel") || norm.includes("power")) return "warning";
  return "default";
}

export const EXPENSE_CATEGORIES = [
  "Materials",
  "Labor",
  "Equipment",
  "Subcontractor",
  "Permits",
  "Utilities",
  "Other",
] as const;

export function ExpenseCategoryBadge({
  category,
  className,
}: ExpenseCategoryBadgeProps) {
  const variant = getExpenseCategoryVariant(category);

  return (
    <Badge variant={variant} className={className}>
      {category}
    </Badge>
  );
}
