"use client";

import React from "react";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isAdmin ? "Project Portfolio" : "My Assigned Projects"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? "Comprehensive overview and operational management of active, planned, and completed site projects."
              : "Projects and task work packages assigned to you across active construction sites."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isAdmin ? "amber" : "info"} dot>
            {isAdmin ? "Admin Access" : "Field Worker"}
          </Badge>
        </div>
      </div>

      {/* Main Workspace Canvas */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Project Repository</CardTitle>
              <CardDescription>
                Phase 2 Application Shell — Project management operations & Gantt tracking will connect in subsequent phases.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Empty / Ready State */}
          <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-4">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Projects Module Initialized
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              The project lifecycle, phases, tasks, and worker assignment engine will be enabled in future phases.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
