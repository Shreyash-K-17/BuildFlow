"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { DashboardData } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ProjectStatusChart } from "@/components/dashboard/project-status-chart";
import { TaskStatusChart } from "@/components/dashboard/task-status-chart";
import { WorkforceAttendanceCard } from "@/components/dashboard/workforce-attendance-card";
import { LowStockMaterialsCard } from "@/components/dashboard/low-stock-materials-card";
import { FinanceOverviewCard } from "@/components/dashboard/finance-overview-card";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const responseData = await api.get<DashboardData>("/dashboard");
      setData(responseData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Unable to load dashboard data from server.");
      } else {
        setError("Network connection error. Please verify backend status.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Admin access guard & initial fetch
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== "admin") {
        router.replace("/unauthorized");
      } else {
        let isSubscribed = true;
        api
          .get<DashboardData>("/dashboard")
          .then((responseData) => {
            if (isSubscribed) {
              setData(responseData);
              setIsLoading(false);
            }
          })
          .catch((err) => {
            if (isSubscribed) {
              if (err instanceof ApiError) {
                setError(err.message || "Unable to load dashboard data from server.");
              } else {
                setError("Network connection error. Please verify backend status.");
              }
              setIsLoading(false);
            }
          });

        return () => {
          isSubscribed = false;
        };
      }
    }
  }, [authLoading, user, router]);

  if (authLoading || (user && user.role !== "admin")) {
    return null;
  }

  // Loading skeleton state
  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  // Error state with interactive retry button
  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-500/30 bg-white dark:bg-slate-900 shadow-xl">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Unable to load dashboard data
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {error}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => fetchDashboardData(false)}
              className="w-full"
            >
              Retry Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const remainingNum = parseFloat(data.finance.remaining_budget) || 0;
  const isBudgetExceeded = remainingNum < 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Dashboard
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Construction operations overview
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            isLoading={isRefreshing}
            onClick={() => fetchDashboardData(true)}
            className="flex items-center gap-1.5"
            aria-label="Refresh Dashboard Metrics"
          >
            <svg
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isRefreshing ? "Syncing..." : "Sync Metrics"}</span>
          </Button>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Projects */}
        <KPICard
          title="Active Projects"
          value={data.projects.active}
          supportingText={`${data.projects.total} Total ${
            data.projects.total === 1 ? "Project" : "Projects"
          }`}
          variant="amber"
          badge={
            data.projects.planning > 0
              ? `${data.projects.planning} Planning`
              : undefined
          }
          badgeVariant="warning"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
        />

        {/* KPI 2: Total Budget */}
        <KPICard
          title="Total Budget"
          value={formatCurrency(data.finance.total_budget)}
          supportingText="Allocated across all projects"
          variant="sky"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        {/* KPI 3: Total Expenses */}
        <KPICard
          title="Total Expenses"
          value={formatCurrency(data.finance.total_expenses)}
          supportingText={`${data.finance.budget_utilization.toFixed(1)}% of total budget`}
          variant="amber"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
              />
            </svg>
          }
        />

        {/* KPI 4: Remaining Budget */}
        <KPICard
          title="Remaining Budget"
          value={formatCurrency(data.finance.remaining_budget)}
          supportingText={
            isBudgetExceeded ? "Over Budget Alert" : "Available Funds"
          }
          variant={isBudgetExceeded ? "danger" : "emerald"}
          badge={isBudgetExceeded ? "Exceeded" : "Healthy"}
          badgeVariant={isBudgetExceeded ? "danger" : "success"}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
              />
            </svg>
          }
        />
      </div>

      {/* Row 2: Projects & Tasks Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectStatusChart projects={data.projects} />
        <TaskStatusChart tasks={data.tasks} />
      </div>

      {/* Row 3: Workforce & Materials Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkforceAttendanceCard workforce={data.workforce} />
        <LowStockMaterialsCard materials={data.materials} />
      </div>

      {/* Row 4: Financial Summary */}
      <FinanceOverviewCard finance={data.finance} />
    </div>
  );
}
