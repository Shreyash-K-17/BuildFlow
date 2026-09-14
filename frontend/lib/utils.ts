import {
  AttendanceStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  TransactionType,
} from "@/types";

/**
 * Combines and normalizes CSS class names.
 */
export function cn(
  ...inputs: (string | undefined | null | false | Record<string, boolean>)[]
): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string") {
      classes.push(input);
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value && key) {
          classes.push(key);
        }
      }
    }
  }

  return classes.join(" ").trim();
}

/**
 * Formats financial values in Indian Rupees (INR ₹) with standard Lakh/Crore grouping.
 */
export function formatCurrency(
  amount: string | number | null | undefined,
  options: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {}
): string {
  if (amount === null || amount === undefined || amount === "") {
    return "₹0";
  }

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return "₹0";
  }

  const maxDigits = options.maximumFractionDigits ?? (Number.isInteger(num) ? 0 : 2);
  const minDigits = options.minimumFractionDigits ?? 0;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    }).format(num);
  } catch {
    return `₹${num.toLocaleString("en-IN")}`;
  }
}

/**
 * Formats financial values into compact, human-friendly Indian denominations:
 * - ₹2.75 Cr
 * - ₹1.20 Cr
 * - ₹25 Lakh
 * - ₹50 Thousand
 */
export function formatCompactCurrency(
  amount: string | number | null | undefined
): string {
  if (amount === null || amount === undefined || amount === "") {
    return "₹0";
  }

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return "₹0";
  }

  const absVal = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (absVal >= 10000000) {
    const v = absVal / 10000000;
    const formatted = v.toLocaleString("en-IN", {
      minimumFractionDigits: v % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return `${sign}₹${formatted} Cr`;
  }

  if (absVal >= 100000) {
    const v = absVal / 100000;
    const formatted = v.toLocaleString("en-IN", {
      minimumFractionDigits: v % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return `${sign}₹${formatted} Lakh`;
  }

  if (absVal >= 1000) {
    const v = absVal / 1000;
    const formatted = v.toLocaleString("en-IN", {
      minimumFractionDigits: v % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return `${sign}₹${formatted} Thousand`;
  }

  return formatCurrency(num);
}

export type BudgetUnit = "crore" | "lakh" | "thousand" | "rupees";

export const BUDGET_UNIT_MULTIPLIERS: Record<BudgetUnit, number> = {
  crore: 10000000,
  lakh: 100000,
  thousand: 1000,
  rupees: 1,
};

export const BUDGET_UNIT_LABELS: Record<BudgetUnit, string> = {
  crore: "Crore",
  lakh: "Lakh",
  thousand: "Thousand",
  rupees: "Rupees",
};

/**
 * Determines a sensible initial Indian denomination unit for an existing budget amount.
 */
export function getSensibleBudgetUnit(
  rupeeAmount: number
): { amount: string; unit: BudgetUnit } {
  if (isNaN(rupeeAmount) || rupeeAmount <= 0) {
    return { amount: "0", unit: "lakh" };
  }
  if (rupeeAmount >= 10000000) {
    const v = rupeeAmount / 10000000;
    return { amount: String(Number(v.toFixed(4))), unit: "crore" };
  }
  if (rupeeAmount >= 100000) {
    const v = rupeeAmount / 100000;
    return { amount: String(Number(v.toFixed(4))), unit: "lakh" };
  }
  if (rupeeAmount >= 1000) {
    const v = rupeeAmount / 1000;
    return { amount: String(Number(v.toFixed(4))), unit: "thousand" };
  }
  return { amount: String(rupeeAmount), unit: "rupees" };
}

/**
 * Converts a human-entered denomination amount to exact numeric rupees.
 */
export function convertBudgetToRupees(
  amountStr: string,
  unit: BudgetUnit
): number {
  const num = parseFloat(amountStr);
  if (isNaN(num) || num < 0) return 0;
  const multiplier = BUDGET_UNIT_MULTIPLIERS[unit] || 1;
  return Math.round(num * multiplier);
}

/**
 * Formats an ISO date string (YYYY-MM-DD or full timestamp) into DD MMM YYYY.
 */
export function formatDate(
  dateStr: string | null | undefined
): string {
  if (!dateStr) return "—";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return "—";
  }
}

/**
 * Formats an ISO timestamp into DD MMM YYYY, hh:mm A.
 */
export function formatDateTime(
  dateStr: string | null | undefined
): string {
  if (!dateStr) return "—";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return "—";
  }
}

/**
 * Status and Badge helper mappings for visual consistency across BuildFlow.
 */
export function getProjectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case "planning":
      return "Planning";
    case "active":
      return "Active";
    case "on_hold":
      return "On Hold";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function getProjectStatusBadgeVariant(
  status: ProjectStatus
): "warning" | "success" | "secondary" | "danger" | "default" {
  switch (status) {
    case "active":
      return "success";
    case "planning":
      return "warning";
    case "on_hold":
      return "secondary";
    case "completed":
      return "default";
    case "cancelled":
      return "danger";
    default:
      return "secondary";
  }
}

export function getTaskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case "not_started":
      return "Not Started";
    case "in_progress":
      return "In Progress";
    case "on_hold":
      return "On Hold";
    case "blocked":
      return "Blocked";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}

export function getTaskStatusBadgeVariant(
  status: TaskStatus
): "secondary" | "warning" | "danger" | "success" | "default" {
  switch (status) {
    case "not_started":
      return "secondary";
    case "in_progress":
      return "warning";
    case "blocked":
      return "danger";
    case "on_hold":
      return "secondary";
    case "completed":
      return "success";
    default:
      return "secondary";
  }
}

export function getTaskPriorityBadgeVariant(
  priority: TaskPriority
): "secondary" | "info" | "warning" | "danger" {
  switch (priority) {
    case "low":
      return "secondary";
    case "medium":
      return "info";
    case "high":
      return "warning";
    case "urgent":
      return "danger";
    default:
      return "secondary";
  }
}

export function getAttendanceStatusBadgeVariant(
  status: AttendanceStatus
): "success" | "danger" | "warning" | "secondary" {
  switch (status) {
    case "present":
      return "success";
    case "absent":
      return "danger";
    case "half_day":
      return "warning";
    case "leave":
      return "secondary";
    default:
      return "secondary";
  }
}

export function getTransactionTypeBadgeVariant(
  type: TransactionType
): "success" | "warning" | "info" | "danger" | "secondary" {
  switch (type) {
    case "purchase":
    case "adjustment_in":
      return "success";
    case "consumption":
    case "adjustment_out":
      return "warning";
    case "return":
      return "info";
    default:
      return "secondary";
  }
}
