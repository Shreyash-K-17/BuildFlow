"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TaskStatusChartProps {
  tasks: {
    total: number;
    not_started: number;
    in_progress: number;
    blocked: number;
    on_hold: number;
    completed: number;
    average_progress: number;
  };
}

export function TaskStatusChart({ tasks }: TaskStatusChartProps) {
  const { total, not_started, in_progress, blocked, on_hold, completed, average_progress } = tasks;

  const progressPercent = Math.min(Math.max(average_progress, 0), 100);

  const statusList = [
    { label: "In Progress", count: in_progress, color: "bg-amber-500", textColor: "text-amber-500" },
    { label: "Blocked", count: blocked, color: "bg-red-500", textColor: "text-red-500", isBlocked: true },
    { label: "Completed", count: completed, color: "bg-emerald-500", textColor: "text-emerald-500" },
    { label: "Not Started", count: not_started, color: "bg-slate-400", textColor: "text-slate-400" },
    { label: "On Hold", count: on_hold, color: "bg-slate-500", textColor: "text-slate-500" },
  ];

  return (
    <Card hoverEffect="default" className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Task Execution</CardTitle>
            <CardDescription>Workflow progress and critical dependency blocks</CardDescription>
          </div>
          {blocked > 0 ? (
            <Badge variant="danger" dot className="animate-pulse">
              {blocked} Blocked {blocked === 1 ? "Task" : "Tasks"}
            </Badge>
          ) : (
            <Badge variant="success" dot>
              Zero Blockers
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Average Progress Metric Banner */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Average Task Progress
            </span>
            <span className="text-lg font-black text-amber-500 dark:text-amber-400">
              {progressPercent.toFixed(1)}%
            </span>
          </div>

          {/* Progress bar container */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Task Breakdown Segments */}
        <div className="space-y-2">
          {statusList.map((item) => {
            const itemPercent = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div
                key={item.label}
                className={`flex items-center justify-between text-xs p-2 rounded-lg transition-colors ${
                  item.isBlocked && item.count > 0
                    ? "bg-red-500/10 border border-red-500/20"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span
                    className={`font-medium ${
                      item.isBlocked && item.count > 0
                        ? "text-red-600 dark:text-red-400 font-semibold"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold ${
                      item.isBlocked && item.count > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {item.count}
                  </span>
                  <span className="text-[10px] text-slate-500 w-8 text-right">
                    {itemPercent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
