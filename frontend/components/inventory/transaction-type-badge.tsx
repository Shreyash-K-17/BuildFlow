"use client";

import React from "react";
import { TransactionType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { getTransactionTypeBadgeVariant } from "@/lib/utils";

interface TransactionTypeBadgeProps {
  type: TransactionType;
  className?: string;
}

export function formatTransactionTypeLabel(type: TransactionType): string {
  switch (type) {
    case "purchase":
      return "Purchase";
    case "consumption":
      return "Consumption";
    case "return":
      return "Return";
    case "adjustment_in":
      return "Adjustment In";
    case "adjustment_out":
      return "Adjustment Out";
    default:
      return type;
  }
}

export function TransactionTypeBadge({
  type,
  className,
}: TransactionTypeBadgeProps) {
  const variant = getTransactionTypeBadgeVariant(type);
  const label = formatTransactionTypeLabel(type);

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
