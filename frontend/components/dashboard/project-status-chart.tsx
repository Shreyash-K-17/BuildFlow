"use client";

import React from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

ChartJS.register(ArcElement, Tooltip, Legend);

interface ProjectStatusChartProps {
  projects: {
    total: number;
    planning: number;
    active: number;
    on_hold: number;
    completed: number;
    cancelled: number;
    total_budget: string;
  };
}

export function ProjectStatusChart({ projects }: ProjectStatusChartProps) {
  const { total, planning, active, on_hold, completed, cancelled, total_budget } = projects;
  const hasData = total > 0;

  const chartData = {
    labels: ["Active", "Planning", "On Hold", "Completed", "Cancelled"],
    datasets: [
      {
        data: hasData
          ? [active, planning, on_hold, completed, cancelled]
          : [0, 0, 0, 0, 0],
        backgroundColor: [
          "#10b981", // Active - Emerald
          "#f59e0b", // Planning - Amber
          "#94a3b8", // On Hold - Slate
          "#0284c7", // Completed - Sky
          "#ef4444", // Cancelled - Ruby Red
        ],
        borderWidth: 2,
        borderColor: "rgba(15, 23, 42, 0.4)",
        hoverOffset: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "75%",
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: hasData,
        backgroundColor: "#0f172a",
        titleColor: "#f8fafc",
        bodyColor: "#f8fafc",
        borderColor: "#334155",
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true,
      },
    },
  };

  const statusItems = [
    { label: "Active", count: active, color: "bg-emerald-500", textColor: "text-emerald-500" },
    { label: "Planning", count: planning, color: "bg-amber-500", textColor: "text-amber-500" },
    { label: "On Hold", count: on_hold, color: "bg-slate-400", textColor: "text-slate-400" },
    { label: "Completed", count: completed, color: "bg-sky-500", textColor: "text-sky-500" },
    { label: "Cancelled", count: cancelled, color: "bg-red-500", textColor: "text-red-500" },
  ];

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Portfolio</CardTitle>
            <CardDescription>Status breakdown across active job sites</CardDescription>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Budget
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(total_budget)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          {/* Chart Container */}
          <div className="sm:col-span-6 relative flex items-center justify-center min-h-[170px]">
            {hasData ? (
              <div className="h-40 w-40 relative">
                <Doughnut data={chartData} options={chartOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                    {total}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-1">
                    Projects
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-36 w-36 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-3 text-center">
                <span className="text-xs font-semibold text-slate-400">0 Projects</span>
                <span className="text-[10px] text-slate-500 mt-0.5">No active records</span>
              </div>
            )}
          </div>

          {/* Legend / Status counts */}
          <div className="sm:col-span-6 space-y-2">
            {statusItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {item.count}
                  </span>
                  <span className="text-[10px] text-slate-500 w-8 text-right">
                    {total > 0 ? `${Math.round((item.count / total) * 100)}%` : "0%"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
