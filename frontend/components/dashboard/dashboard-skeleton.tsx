import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading dashboard metrics">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-72 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-9 w-9 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              </div>
              <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-3 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[280px]">
          <CardHeader className="space-y-2">
            <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3 w-56 bg-slate-200 dark:bg-slate-800 rounded" />
          </CardHeader>
          <CardContent className="flex items-center justify-center p-8">
            <div className="h-36 w-36 rounded-full bg-slate-200 dark:bg-slate-800" />
          </CardContent>
        </Card>

        <Card className="min-h-[280px]">
          <CardHeader className="space-y-2">
            <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3 w-56 bg-slate-200 dark:bg-slate-800 rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="space-y-2">
              <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Workforce & Low Stock Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[240px]">
          <CardHeader className="space-y-2">
            <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3 w-60 bg-slate-200 dark:bg-slate-800 rounded" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[240px]">
          <CardHeader className="space-y-2">
            <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3 w-60 bg-slate-200 dark:bg-slate-800 rounded" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Finance Skeleton */}
      <Card className="min-h-[200px]">
        <CardHeader className="space-y-2">
          <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-3 w-64 bg-slate-200 dark:bg-slate-800 rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </CardContent>
      </Card>
    </div>
  );
}
