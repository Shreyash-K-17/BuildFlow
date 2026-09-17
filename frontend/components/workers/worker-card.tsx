"use client";

import React from "react";
import { Worker } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface WorkerCardProps {
  worker: Worker;
  isAdmin: boolean;
  onEdit: (worker: Worker) => void;
}

export function WorkerCard({ worker, isAdmin, onEdit }: WorkerCardProps) {
  const formattedWage = worker.daily_wage
    ? formatCurrency(worker.daily_wage)
    : "—";

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-150 space-y-3 buildflow-hover-card">
      {/* Top row: Name, Worker Type, Status, Edit button */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {worker.name}
            </h3>
            {worker.is_active ? (
              <Badge variant="success" dot>
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" dot>
                Inactive
              </Badge>
            )}
            {worker.worker_type && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {worker.worker_type}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
            <span className="truncate">{worker.email}</span>
            {worker.phone && <span>• {worker.phone}</span>}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
            {worker.joined_date ? (
              <span>Working since {formatDate(worker.joined_date)}</span>
            ) : (
              <span className="italic text-slate-400 dark:text-slate-500">Joining date not provided</span>
            )}
          </div>
        </div>

        {isAdmin && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(worker)}
            className="h-7 px-2.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 shrink-0"
            aria-label={`Edit worker ${worker.name}`}
          >
            Edit
          </Button>
        )}
      </div>

      {/* Bottom row: Daily Wage & Linked Account info */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Daily Wage:
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {formattedWage}
            {worker.daily_wage && (
              <span className="text-[10px] text-slate-400 font-normal"> /day</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Login User #{worker.user_id}</span>
        </div>
      </div>
    </div>
  );
}
