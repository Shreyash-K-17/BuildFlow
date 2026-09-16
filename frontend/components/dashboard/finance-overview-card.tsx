"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface FinanceOverviewCardProps {
  finance: {
    total_budget: string;
    total_expenses: string;
    remaining_budget: string;
    budget_utilization: number;
  };
}

export function FinanceOverviewCard({ finance }: FinanceOverviewCardProps) {
  const { total_budget, total_expenses, remaining_budget, budget_utilization } = finance;

  const remainingNum = parseFloat(remaining_budget) || 0;
  const isOverBudget = remainingNum < 0;
  const utilizationClampedForBar = Math.min(Math.max(budget_utilization, 0), 100);

  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedWidth(utilizationClampedForBar);
    }, 50);
    return () => clearTimeout(timeout);
  }, [utilizationClampedForBar]);

  const getStatusBadge = () => {
    if (isOverBudget) {
      return (
        <Badge variant="danger" dot className="animate-pulse">
          Budget Exceeded
        </Badge>
      );
    }
    if (budget_utilization >= 80) {
      return (
        <Badge variant="warning" dot>
          High Utilization
        </Badge>
      );
    }
    return (
      <Badge variant="success" dot>
        Within Budget
      </Badge>
    );
  };

  const getBarColor = () => {
    if (isOverBudget) return "bg-red-500";
    if (budget_utilization >= 80) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <Card hoverEffect="default" className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>Budget allocation, project expenses, and burn rate</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Metric Triplet */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total Budget */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Budget
            </span>
            <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {formatCurrency(total_budget)}
            </p>
          </div>

          {/* Total Expenses */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Expenses
            </span>
            <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {formatCurrency(total_expenses)}
            </p>
          </div>

          {/* Remaining Budget */}
          <div
            className={`rounded-xl border p-3.5 flex flex-col justify-center ${
              isOverBudget
                ? "border-red-500/30 bg-red-500/10"
                : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isOverBudget ? "text-red-500" : "text-slate-500"
                }`}
              >
                Remaining Budget
              </span>
            </div>
            <p
              className={`mt-1 text-base font-bold truncate ${
                isOverBudget
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatCurrency(remaining_budget)}
            </p>
          </div>
        </div>

        {/* Budget Utilization Bar */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Budget Utilization
              </span>
              {isOverBudget && (
                <span className="text-[10px] font-semibold text-red-500">
                  (Cap Exceeded)
                </span>
              )}
            </div>
            <span
              className={`text-sm font-black ${
                isOverBudget
                  ? "text-red-500 dark:text-red-400"
                  : budget_utilization >= 80
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-emerald-500 dark:text-emerald-400"
              }`}
            >
              {budget_utilization.toFixed(2)}%
            </span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out motion-reduce:transition-none ${getBarColor()}`}
              style={{ width: `${animatedWidth}%` }}
              role="progressbar"
              aria-valuenow={budget_utilization}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
