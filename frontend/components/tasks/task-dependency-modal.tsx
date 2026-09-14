"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Task,
  TaskDependency,
  ProjectPhase,
  DependenciesResponseData,
  DependencyResponseData,
} from "@/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TaskStatusBadge } from "./task-status-badge";
import { TaskPriorityBadge } from "./task-priority-badge";
import { api, ApiError } from "@/lib/api";

interface TaskDependencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  allTasks: Task[];
  phases?: ProjectPhase[];
  isAdmin: boolean;
  onDependenciesChanged: () => void;
}

interface TaskDependencyContentProps {
  onClose: () => void;
  task: Task;
  allTasks: Task[];
  phases: ProjectPhase[];
  isAdmin: boolean;
  onDependenciesChanged: () => void;
}

function TaskDependencyContent({
  onClose,
  task,
  allTasks,
  phases,
  isAdmin,
  onDependenciesChanged,
}: TaskDependencyContentProps) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [selectedTaskIdToAdd, setSelectedTaskIdToAdd] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Map tasks and phases for fast lookup
  const taskMap = useMemo(() => {
    const map = new Map<number, Task>();
    for (const t of allTasks) {
      map.set(t.id, t);
    }
    return map;
  }, [allTasks]);

  const phaseMap = useMemo(() => {
    const map = new Map<number, ProjectPhase>();
    for (const p of phases) {
      map.set(p.id, p);
    }
    return map;
  }, [phases]);

  // Existing prerequisite task IDs
  const existingPrereqIds = useMemo(() => {
    return new Set(dependencies.map((d) => d.depends_on_task_id));
  }, [dependencies]);

  // Available tasks to add as prerequisites (from same project, not self, not already a prereq)
  const availableTasks = useMemo(() => {
    return allTasks.filter(
      (t) => t.id !== task.id && !existingPrereqIds.has(t.id)
    );
  }, [allTasks, task.id, existingPrereqIds]);

  const fetchDependencies = useCallback(async () => {
    try {
      const data = await api.get<DependenciesResponseData>(
        `/tasks/${task.id}/dependencies`
      );
      setDependencies(data.dependencies || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load task dependencies.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [task.id]);

  useEffect(() => {
    let isSubscribed = true;
    api
      .get<DependenciesResponseData>(`/tasks/${task.id}/dependencies`)
      .then((data) => {
        if (isSubscribed) {
          setDependencies(data.dependencies || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError("Failed to load task dependencies.");
          }
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [task.id]);

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskIdToAdd) return;

    const prereqId = parseInt(selectedTaskIdToAdd, 10);
    if (isNaN(prereqId)) return;

    setIsAdding(true);
    setAddError(null);

    try {
      await api.post<DependencyResponseData>(`/tasks/${task.id}/dependencies`, {
        depends_on_task_id: prereqId,
      });

      setSelectedTaskIdToAdd("");
      await fetchDependencies();
      onDependenciesChanged();
    } catch (err) {
      if (err instanceof ApiError) {
        setAddError(err.message);
      } else {
        setAddError("Failed to link dependency prerequisite.");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteDependency = async (dependencyId: number) => {
    setDeletingId(dependencyId);
    setAddError(null);

    try {
      await api.delete(`/tasks/${task.id}/dependencies/${dependencyId}`);
      await fetchDependencies();
      onDependenciesChanged();
    } catch (err) {
      if (err instanceof ApiError) {
        setAddError(err.message);
      } else {
        setAddError("Failed to remove dependency link.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const currentPhase = phaseMap.get(task.phase_id);

  return (
    <div className="p-6 space-y-5">
      {/* Target Task Header */}
      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Target Task #{task.id}
            </span>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {task.title}
            </h4>
            {currentPhase && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Phase: {currentPhase.name} (Order {currentPhase.phase_order})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TaskPriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
          </div>
        </div>
      </div>

      {/* Global Error message */}
      {error && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Prerequisites List Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Prerequisite Tasks ({dependencies.length})
          </h4>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Must be 100% completed to start
          </span>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <svg
              className="animate-spin h-5 w-5 mx-auto mb-2 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading dependencies...
          </div>
        ) : dependencies.length === 0 ? (
          <div className="p-5 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              No prerequisites configured.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              This task has no blockers and can start independently.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {dependencies.map((dep) => {
              const prereq = taskMap.get(dep.depends_on_task_id);
              const prereqPhase = prereq ? phaseMap.get(prereq.phase_id) : null;
              const isCompleted = prereq?.status === "completed";

              return (
                <div
                  key={dep.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {prereq ? prereq.title : `Task #${dep.depends_on_task_id}`}
                      </span>
                      {prereq && <TaskPriorityBadge priority={prereq.priority} />}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {prereqPhase && (
                        <span>
                          Phase: {prereqPhase.name} (Order {prereqPhase.phase_order})
                        </span>
                      )}
                      <span>•</span>
                      <span>Progress: {prereq ? `${prereq.progress}%` : "—"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                    {prereq ? (
                      <div className="flex items-center gap-1.5">
                        <TaskStatusBadge status={prereq.status} />
                        {isCompleted ? (
                          <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-0.5">
                            ✓ Ready
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-500 font-medium flex items-center gap-0.5">
                            🔒 Blocking
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Unknown Task</span>
                    )}

                    {isAdmin && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDependency(dep.id)}
                        disabled={deletingId === dep.id}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-7 px-2 text-xs"
                        aria-label="Remove dependency"
                      >
                        {deletingId === dep.id ? "Removing..." : "Remove"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Prerequisite Section (Admin Only) */}
      {isAdmin && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Add Prerequisite Task
          </h4>

          {addError && (
            <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
              {addError}
            </div>
          )}

          <form
            onSubmit={handleAddDependency}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            <div className="flex-1">
              <select
                value={selectedTaskIdToAdd}
                onChange={(e) => setSelectedTaskIdToAdd(e.target.value)}
                disabled={isAdding || availableTasks.length === 0}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              >
                <option value="">
                  {availableTasks.length === 0
                    ? "-- No other tasks available in this project --"
                    : "-- Select prerequisite task to require --"}
                </option>
                {availableTasks.map((t) => {
                  const phase = phaseMap.get(t.phase_id);
                  return (
                    <option key={t.id} value={t.id}>
                      {phase ? `[${phase.name}] ` : ""}
                      {t.title} ({t.status.replace("_", " ")}, {t.progress}%)
                    </option>
                  );
                })}
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!selectedTaskIdToAdd || isAdding}
              isLoading={isAdding}
              className="shrink-0"
            >
              + Require Task
            </Button>
          </form>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Dependency cycles and self-dependencies are validated and rejected by the server.
          </p>
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

export function TaskDependencyModal({
  isOpen,
  onClose,
  task,
  allTasks,
  phases = [],
  isAdmin,
  onDependenciesChanged,
}: TaskDependencyModalProps) {
  return (
    <Modal
      isOpen={isOpen && Boolean(task)}
      onClose={onClose}
      title="Task Prerequisites & Dependencies"
      description="Manage dependencies that must complete before this task can start."
      maxWidth="lg"
    >
      {isOpen && task && (
        <TaskDependencyContent
          key={task.id}
          onClose={onClose}
          task={task}
          allTasks={allTasks}
          phases={phases}
          isAdmin={isAdmin}
          onDependenciesChanged={onDependenciesChanged}
        />
      )}
    </Modal>
  );
}
