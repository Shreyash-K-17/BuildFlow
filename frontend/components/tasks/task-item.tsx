"use client";

import React from "react";
import { Task, Worker, TaskDependency, User } from "@/types";
import { TaskStatusBadge } from "./task-status-badge";
import { TaskPriorityBadge } from "./task-priority-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface TaskItemProps {
  task: Task;
  workersMap: Record<number, Worker>;
  allTasksMap: Record<number, Task>;
  dependencies?: TaskDependency[];
  currentUser: User | null;
  isAdmin: boolean;
  onEdit: (task: Task) => void;
  onManageDependencies: (task: Task) => void;
}

export function TaskItem({
  task,
  workersMap,
  allTasksMap,
  dependencies = [],
  currentUser,
  isAdmin,
  onEdit,
  onManageDependencies,
}: TaskItemProps) {
  const assignedWorker = task.assigned_worker_id
    ? workersMap[task.assigned_worker_id]
    : null;

  const isAssignedToCurrentUser = Boolean(
    assignedWorker &&
      assignedWorker.user_id &&
      currentUser &&
      assignedWorker.user_id === currentUser.id
  );

  // Analyze prerequisites
  const prereqTasks = dependencies.map((dep) => ({
    depId: dep.id,
    task: allTasksMap[dep.depends_on_task_id],
    taskId: dep.depends_on_task_id,
  }));

  const incompletePrereqs = prereqTasks.filter(
    (p) => !p.task || p.task.status !== "completed"
  );

  const isLocked = dependencies.length > 0 && incompletePrereqs.length > 0;
  const isPrereqComplete = dependencies.length > 0 && incompletePrereqs.length === 0;

  // Semantic progress bar color
  const getProgressBarColor = () => {
    switch (task.status) {
      case "completed":
        return "bg-emerald-500";
      case "in_progress":
        return "bg-sky-500";
      case "blocked":
        return "bg-red-500";
      case "on_hold":
        return "bg-amber-500";
      case "not_started":
      default:
        return "bg-slate-300 dark:bg-slate-700";
    }
  };

  return (
    <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-150 space-y-3 buildflow-hover-card">
      {/* Top Header Row: Task ID, Title, Status Badge, Priority Badge, Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">
              #{task.id}
            </span>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">
              {task.title}
            </h4>
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />

            {isAssignedToCurrentUser && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                ★ Assigned to You
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onManageDependencies(task)}
            className="h-7 px-2.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80"
            aria-label={`Dependencies for task ${task.title}`}
          >
            <span className="flex items-center gap-1.5">
              <span>Prerequisites</span>
              {dependencies.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                  {dependencies.length}
                </span>
              )}
            </span>
          </Button>

          {isAdmin && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(task)}
              className="h-7 px-2.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80"
              aria-label={`Edit task ${task.title}`}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Middle row: Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-400">
            Execution Progress
          </span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
            {task.progress}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${getProgressBarColor()}`}
            style={{ width: `${Math.min(Math.max(task.progress, 0), 100)}%` }}
          />
        </div>
      </div>

      {/* Lock / Dependency Explanation Section */}
      {isLocked && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold">
            <span>🔒 Locked — Waiting on Prerequisites</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
            <span className="font-medium block text-amber-600 dark:text-amber-400">
              Blocked by incomplete tasks:
            </span>
            <ul className="list-disc list-inside space-y-0.5 pl-1 text-slate-700 dark:text-slate-300">
              {incompletePrereqs.map((p) => (
                <li key={p.depId}>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {p.task ? p.task.title : `Task #${p.taskId}`}
                  </span>
                  {p.task && (
                    <span className="text-slate-500 dark:text-slate-400 ml-1 font-mono">
                      ({p.task.status.replace("_", " ")}, {p.task.progress}%)
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">
              Prerequisites must be 100% completed before this task can start.
            </p>
          </div>
        </div>
      )}

      {isPrereqComplete && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <span>✓ Prerequisites Complete — Ready to Execute</span>
        </div>
      )}

      {/* Bottom row: Worker assignment, Dates */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">
            WORKER:
          </span>
          {assignedWorker ? (
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {assignedWorker.name}
              {assignedWorker.worker_type ? (
                <span className="text-slate-500 dark:text-slate-400 ml-1">
                  ({assignedWorker.worker_type})
                </span>
              ) : null}
            </span>
          ) : (
            <span className="italic text-slate-400 dark:text-slate-500">Unassigned</span>
          )}
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div>
            <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] mr-1">
              Start:
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {formatDate(task.start_date)}
            </span>
          </div>
          <div>
            <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] mr-1">
              Due:
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {formatDate(task.due_date)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
