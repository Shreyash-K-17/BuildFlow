"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") {
      router.replace("/unauthorized");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Executive Operations Dashboard
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time project health, site workforce metrics, and material operations across active sites.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="amber" dot>
            Admin Console
          </Badge>
        </div>
      </div>

      {/* Phase 2 Foundation Notice */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-800 dark:text-amber-300 flex items-start gap-3">
        <svg
          className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            Phase 2 Shell Active
          </p>
          <p className="mt-0.5 opacity-90">
            Live backend telemetry and operational aggregates will connect in Phase 3. Section structures below reflect the finalized backend reporting schemas.
          </p>
        </div>
      </div>

      {/* 4 Core Summary Grid Placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Projects Overview */}
        <Card hoverEffect>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Projects
              </span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
            </div>
            <CardTitle className="text-lg mt-1">Project Portfolio</CardTitle>
            <CardDescription>
              Status tracking across planning, active, and completed phases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800/60 p-3 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
              Live metrics ready for Phase 3
            </div>
          </CardContent>
        </Card>

        {/* Workforce & Attendance */}
        <Card hoverEffect>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Workforce
              </span>
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <CardTitle className="text-lg mt-1">Site Attendance</CardTitle>
            <CardDescription>
              Daily check-ins, active worker counts, and shift logs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800/60 p-3 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
              Live metrics ready for Phase 3
            </div>
          </CardContent>
        </Card>

        {/* Materials & Inventory */}
        <Card hoverEffect>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Inventory
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            </div>
            <CardTitle className="text-lg mt-1">Material Stocks</CardTitle>
            <CardDescription>
              Stock levels, low-stock threshold alerts, and consumptions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800/60 p-3 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
              Live metrics ready for Phase 3
            </div>
          </CardContent>
        </Card>

        {/* Finance & Budget Operations */}
        <Card hoverEffect>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Finance
              </span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
                  />
                </svg>
              </div>
            </div>
            <CardTitle className="text-lg mt-1">Financial Health</CardTitle>
            <CardDescription>
              Budget utilization, aggregated expenses, and cost balances.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800/60 p-3 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
              Live metrics ready for Phase 3
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
