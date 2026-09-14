"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WorkforceAttendanceCardProps {
  workforce: {
    active_workers: number;
    attendance: {
      present: number;
      absent: number;
      half_day: number;
      leave: number;
    };
  };
}

export function WorkforceAttendanceCard({ workforce }: WorkforceAttendanceCardProps) {
  const { active_workers, attendance } = workforce;
  const { present, absent, half_day, leave } = attendance;

  const totalLogs = present + absent + half_day + leave;

  const attendanceItems = [
    { label: "Present", count: present, color: "bg-emerald-500", variant: "success" as const },
    { label: "Half Day", count: half_day, color: "bg-amber-500", variant: "warning" as const },
    { label: "Absent", count: absent, color: "bg-red-500", variant: "danger" as const },
    { label: "On Leave", count: leave, color: "bg-slate-400", variant: "secondary" as const },
  ];

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Workforce & Attendance</CardTitle>
            <CardDescription>Active personnel and aggregate attendance overview</CardDescription>
          </div>
          <Badge variant="info" dot>
            {active_workers} Active {active_workers === 1 ? "Worker" : "Workers"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Active Staff Summary */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Staff Registry
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {active_workers} Active Registered Field Workers
              </p>
            </div>
          </div>
        </div>

        {/* Attendance Breakdown Grid */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Attendance Overview
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {attendanceItems.map((item) => {
              const itemPercent = totalLogs > 0 ? Math.round((item.count / totalLogs) * 100) : 0;
              return (
                <div
                  key={item.label}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-3 text-center"
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className={`h-2 w-2 rounded-full ${item.color}`} />
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {item.count}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {itemPercent}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
