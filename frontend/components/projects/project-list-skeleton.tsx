import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export function ProjectListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading projects">
      {/* Metric Counters Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="h-9 w-full sm:w-72 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="flex gap-2 w-full sm:w-auto overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg flex-shrink-0"
            />
          ))}
        </div>
      </div>

      {/* Table / List Skeleton */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                </div>
                <div className="flex items-center sm:flex-col sm:items-end gap-2">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
