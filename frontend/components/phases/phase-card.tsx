"use client";

import React from "react";
import { ProjectPhase, Task, Worker, TaskDependency, User } from "@/types";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskItem } from "@/components/tasks/task-item";

interface PhaseCardProps {
  phase: ProjectPhase;
  tasks: Task[];
  taskDependenciesMap: Record<number, TaskDependency[]>;
  allTasksMap: Record<number, Task>;
  workersMap: Record<number, Worker>;
  currentUser: User | null;
  isAdmin: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditPhase: (phase: ProjectPhase) => void;
  onAddTask: (phase: ProjectPhase) => void;
  onEditTask: (task: Task) => void;
  onManageDependencies: (task: Task) => void;
}

export function PhaseCard({
  phase,
  tasks,
  taskDependenciesMap,
  allTasksMap,
  workersMap,
  currentUser,
  isAdmin,
  isExpanded,
  onToggleExpand,
  onEditPhase,
  onAddTask,
  onEditTask,
  onManageDependencies,
}: PhaseCardProps) {
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const formattedOrder = String(phase.phase_order).padStart(2, "0");

  return (
    <Card hoverEffect="default" className="overflow-hidden transition-all duration-200">
      <CardHeader className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Phase Title, Order Badge, Description */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Phase {formattedOrder}
              </span>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {phase.name}
              </h3>
            </div>

            {phase.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                {phase.description}
              </p>
            )}
          </div>

          {/* Right: Metrics & Action Buttons */}
          <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
            {/* Task count & progress metric */}
            <div className="text-left md:text-right">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {completedTasks} / {totalTasks} Tasks
              </div>
              <div className="text-[11px] text-slate-400">
                {completionPercentage}% complete
              </div>
            </div>

            {/* Admin Buttons */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEditPhase(phase)}
                    className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-300"
                    aria-label={`Edit Phase ${phase.name}`}
                  >
                    Edit Phase
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => onAddTask(phase)}
                    className="h-8 px-3 text-xs"
                    aria-label={`Add task to Phase ${phase.name}`}
                  >
                    + Add Task
                  </Button>
                </>
              )}

              {/* Expand/Collapse toggle */}
              <button
                type="button"
                onClick={onToggleExpand}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Collapse tasks" : "Expand tasks"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Phase Mini Progress Bar */}
        <div className="mt-3 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              completionPercentage === 100
                ? "bg-emerald-500"
                : "bg-amber-500"
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </CardHeader>

      {/* Expandable Task List Section */}
      {isExpanded && (
        <CardContent className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="pt-4 space-y-3">
            {tasks.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {isAdmin
                    ? "No tasks created in this phase yet."
                    : "No tasks have been added to this phase yet."}
                </p>
                {isAdmin && (
                  <div className="mt-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onAddTask(phase)}
                      className="text-xs"
                    >
                      + Create First Task
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  workersMap={workersMap}
                  allTasksMap={allTasksMap}
                  dependencies={taskDependenciesMap[task.id] || []}
                  currentUser={currentUser}
                  isAdmin={isAdmin}
                  onEdit={onEditTask}
                  onManageDependencies={onManageDependencies}
                />
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
