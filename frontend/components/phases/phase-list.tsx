"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ProjectPhase,
  Task,
  Worker,
  TaskDependency,
  PhasesResponseData,
  TasksResponseData,
  WorkersResponseData,
  DependenciesResponseData,
} from "@/types";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PhaseCard } from "./phase-card";
import { PhaseFormModal } from "./phase-form-modal";
import { TaskFormModal } from "@/components/tasks/task-form-modal";
import { TaskDependencyModal } from "@/components/tasks/task-dependency-modal";

interface PhaseListProps {
  projectId: number;
}

export function PhaseList({ projectId }: PhaseListProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [tasksByPhase, setTasksByPhase] = useState<Record<number, Task[]>>({});
  const [taskDependenciesMap, setTaskDependenciesMap] = useState<
    Record<number, TaskDependency[]>
  >({});
  const [workers, setWorkers] = useState<Worker[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedPhaseIds, setExpandedPhaseIds] = useState<Set<number>>(
    new Set()
  );

  // Phase modal state
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);

  // Task modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activePhaseForTask, setActivePhaseForTask] =
    useState<ProjectPhase | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Dependency modal state
  const [isDependencyModalOpen, setIsDependencyModalOpen] = useState(false);
  const [activeTaskForDep, setActiveTaskForDep] = useState<Task | null>(null);

  // Workers dictionary for fast lookup
  const workersMap = useMemo(() => {
    const map: Record<number, Worker> = {};
    for (const w of workers) {
      map[w.id] = w;
    }
    return map;
  }, [workers]);

  // All tasks in the project as a flat list
  const allTasks = useMemo(() => {
    return Object.values(tasksByPhase).flat();
  }, [tasksByPhase]);

  // All tasks dictionary for fast ID lookup
  const allTasksMap = useMemo(() => {
    const map: Record<number, Task> = {};
    for (const t of allTasks) {
      map[t.id] = t;
    }
    return map;
  }, [allTasks]);

  // Fetch dependencies for all given tasks
  const fetchTaskDependencies = useCallback(async (tasks: Task[]) => {
    if (tasks.length === 0) return;

    try {
      const depResults = await Promise.all(
        tasks.map(async (t) => {
          try {
            const res = await api.get<DependenciesResponseData>(
              `/tasks/${t.id}/dependencies`
            );
            return { taskId: t.id, dependencies: res.dependencies || [] };
          } catch {
            return { taskId: t.id, dependencies: [] };
          }
        })
      );

      const nextMap: Record<number, TaskDependency[]> = {};
      for (const item of depResults) {
        nextMap[item.taskId] = item.dependencies;
      }

      setTaskDependenciesMap(nextMap);
    } catch {
      // Ignore background dependency loading errors
    }
  }, []);

  // Main data load function (for manual refetch / mutations)
  const loadData = useCallback(async () => {
    try {
      // 1. Fetch phases and workers in parallel
      const [phasesRes, workersRes] = await Promise.all([
        api.get<PhasesResponseData>(`/projects/${projectId}/phases`),
        api.get<WorkersResponseData>("/workers").catch(() => ({ workers: [] })),
      ]);

      const loadedPhases = (phasesRes.phases || []).sort(
        (a, b) => a.phase_order - b.phase_order
      );
      setPhases(loadedPhases);
      setWorkers(workersRes.workers || []);

      // 2. Fetch tasks for each phase in parallel
      if (loadedPhases.length > 0) {
        const taskResults = await Promise.all(
          loadedPhases.map(async (p) => {
            try {
              const res = await api.get<TasksResponseData>(
                `/phases/${p.id}/tasks`
              );
              return { phaseId: p.id, tasks: res.tasks || [] };
            } catch {
              return { phaseId: p.id, tasks: [] };
            }
          })
        );

        const newTasksByPhase: Record<number, Task[]> = {};
        const flatTasks: Task[] = [];

        for (const item of taskResults) {
          newTasksByPhase[item.phaseId] = item.tasks;
          flatTasks.push(...item.tasks);
        }

        setTasksByPhase(newTasksByPhase);
        setExpandedPhaseIds(new Set(loadedPhases.map((p) => p.id)));

        // 3. Fetch dependencies for all loaded tasks
        await fetchTaskDependencies(flatTasks);
      } else {
        setTasksByPhase({});
        setTaskDependenciesMap({});
      }
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load project phases and tasks.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, fetchTaskDependencies]);

  useEffect(() => {
    let isSubscribed = true;

    async function initialFetch() {
      try {
        const [phasesRes, workersRes] = await Promise.all([
          api.get<PhasesResponseData>(`/projects/${projectId}/phases`),
          api.get<WorkersResponseData>("/workers").catch(() => ({ workers: [] })),
        ]);

        if (!isSubscribed) return;

        const loadedPhases = (phasesRes.phases || []).sort(
          (a, b) => a.phase_order - b.phase_order
        );
        setPhases(loadedPhases);
        setWorkers(workersRes.workers || []);

        if (loadedPhases.length > 0) {
          const taskResults = await Promise.all(
            loadedPhases.map(async (p) => {
              try {
                const res = await api.get<TasksResponseData>(
                  `/phases/${p.id}/tasks`
                );
                return { phaseId: p.id, tasks: res.tasks || [] };
              } catch {
                return { phaseId: p.id, tasks: [] };
              }
            })
          );

          if (!isSubscribed) return;

          const newTasksByPhase: Record<number, Task[]> = {};
          const flatTasks: Task[] = [];

          for (const item of taskResults) {
            newTasksByPhase[item.phaseId] = item.tasks;
            flatTasks.push(...item.tasks);
          }

          setTasksByPhase(newTasksByPhase);
          setExpandedPhaseIds(new Set(loadedPhases.map((p) => p.id)));
          setIsLoading(false);

          await fetchTaskDependencies(flatTasks);
        } else {
          setTasksByPhase({});
          setTaskDependenciesMap({});
          setIsLoading(false);
        }
      } catch (err) {
        if (isSubscribed) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError("Failed to load project phases and tasks.");
          }
          setIsLoading(false);
        }
      }
    }

    initialFetch();

    return () => {
      isSubscribed = false;
    };
  }, [projectId, fetchTaskDependencies]);

  // Refresh single phase tasks after task mutation
  const refreshPhaseTasks = async (phaseId: number) => {
    try {
      const res = await api.get<TasksResponseData>(`/phases/${phaseId}/tasks`);
      setTasksByPhase((prev) => {
        const next = { ...prev, [phaseId]: res.tasks || [] };
        // Trigger background dependency fetch for all tasks
        const flat = Object.values(next).flat();
        fetchTaskDependencies(flat);
        return next;
      });
    } catch {
      // Fallback to full reload
      loadData();
    }
  };

  // Toggle phase collapse
  const handleToggleExpand = (phaseId: number) => {
    setExpandedPhaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  // Expand all / Collapse all
  const handleToggleExpandAll = () => {
    if (expandedPhaseIds.size === phases.length) {
      setExpandedPhaseIds(new Set());
    } else {
      setExpandedPhaseIds(new Set(phases.map((p) => p.id)));
    }
  };

  // Modal Triggers
  const handleCreatePhase = () => {
    setEditingPhase(null);
    setIsPhaseModalOpen(true);
  };

  const handleEditPhase = (phase: ProjectPhase) => {
    setEditingPhase(phase);
    setIsPhaseModalOpen(true);
  };

  const handleAddTask = (phase: ProjectPhase) => {
    setActivePhaseForTask(phase);
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    const parentPhase = phases.find((p) => p.id === task.phase_id) || null;
    setActivePhaseForTask(parentPhase);
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleManageDependencies = (task: Task) => {
    setActiveTaskForDep(task);
    setIsDependencyModalOpen(true);
  };

  // Overall metrics calculation
  const totalPhases = phases.length;
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "completed").length;
  const overallProgress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Next suggested phase order
  const suggestedPhaseOrder =
    phases.length > 0
      ? Math.max(...phases.map((p) => p.phase_order)) + 1
      : 1;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse space-y-3"
            >
              <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800/60 rounded" />
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800/40 rounded mt-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-center space-y-3">
        <p className="text-sm font-medium">{error}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setIsLoading(true);
            loadData();
          }}
          className="text-xs"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Section Header: Title, Global Metrics, Admin Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Work Breakdown Structure
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {totalPhases} {totalPhases === 1 ? "Phase" : "Phases"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Execution phases, deliverables, workforce assignments, and prerequisite locks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {phases.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggleExpandAll}
              className="text-xs text-slate-500 dark:text-slate-400"
            >
              {expandedPhaseIds.size === phases.length
                ? "Collapse All"
                : "Expand All"}
            </Button>
          )}

          {isAdmin && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCreatePhase}
              className="text-xs font-semibold"
            >
              + New Phase
            </Button>
          )}
        </div>
      </div>

      {/* Progress Metrics Banner (if phases exist) */}
      {phases.length > 0 && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center sm:text-left">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Phases
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {totalPhases}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Total Tasks
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {totalTasks}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Completed
              </span>
              <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
                {completedTasks}
              </span>
            </div>
          </div>

          <div className="sm:w-64 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Overall Completion</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {overallProgress}%
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {phases.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl">
            🏗️
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isAdmin
                ? "No phases created for this project yet."
                : "No phases have been added to this project yet."}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {isAdmin
                ? "Break down the project into structured execution phases such as Excavation, Foundation, Framing, and Finishing."
                : "Project phases and site deliverables will appear here once configured by the project administrator."}
            </p>
          </div>
          {isAdmin && (
            <div className="pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleCreatePhase}
                size="sm"
              >
                + Create First Phase
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Phase List Cards */
        <div className="space-y-4">
          {phases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              tasks={tasksByPhase[phase.id] || []}
              taskDependenciesMap={taskDependenciesMap}
              allTasksMap={allTasksMap}
              workersMap={workersMap}
              currentUser={user}
              isAdmin={isAdmin}
              isExpanded={expandedPhaseIds.has(phase.id)}
              onToggleExpand={() => handleToggleExpand(phase.id)}
              onEditPhase={handleEditPhase}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onManageDependencies={handleManageDependencies}
            />
          ))}
        </div>
      )}

      {/* Phase Form Modal */}
      <PhaseFormModal
        isOpen={isPhaseModalOpen}
        onClose={() => setIsPhaseModalOpen(false)}
        projectId={projectId}
        initialData={editingPhase}
        suggestedOrder={suggestedPhaseOrder}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Task Form Modal */}
      {activePhaseForTask && (
        <TaskFormModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setActivePhaseForTask(null);
            setEditingTask(null);
          }}
          phaseId={activePhaseForTask.id}
          phaseName={activePhaseForTask.name}
          initialData={editingTask}
          workers={workers}
          onSuccess={() => {
            refreshPhaseTasks(activePhaseForTask.id);
          }}
        />
      )}

      {/* Task Dependency Modal */}
      <TaskDependencyModal
        isOpen={isDependencyModalOpen}
        onClose={() => {
          setIsDependencyModalOpen(false);
          setActiveTaskForDep(null);
        }}
        task={activeTaskForDep}
        allTasks={allTasks}
        phases={phases}
        isAdmin={isAdmin}
        onDependenciesChanged={() => {
          fetchTaskDependencies(allTasks);
        }}
      />
    </div>
  );
}
