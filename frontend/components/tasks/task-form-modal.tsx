"use client";

import React, { useState } from "react";
import {
  Task,
  TaskStatus,
  TaskPriority,
  Worker,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskResponseData,
} from "@/types";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  phaseId: number;
  phaseName?: string;
  initialData?: Task | null;
  workers: Worker[];
  onSuccess: (task: Task) => void;
}

interface FormState {
  title: string;
  description: string;
  status: TaskStatus;
  progress: number;
  priority: TaskPriority;
  assigned_worker_id: string;
  start_date: string;
  due_date: string;
}

interface TaskFormContentProps {
  onClose: () => void;
  phaseId: number;
  initialData?: Task | null;
  workers: Worker[];
  onSuccess: (task: Task) => void;
}

function getProgressHelperText(status: TaskStatus): string {
  switch (status) {
    case "not_started":
      return "Progress is automatically 0% for tasks not started.";
    case "in_progress":
      return "Adjust execution progress from 1% to 99%.";
    case "on_hold":
      return "Progress is preserved while the task is on hold.";
    case "blocked":
      return "Progress is preserved while the task is blocked.";
    case "completed":
      return "Completed tasks always have 100% execution progress.";
    default:
      return "";
  }
}

function TaskFormContent({
  onClose,
  phaseId,
  initialData,
  workers,
  onSuccess,
}: TaskFormContentProps) {
  const isEdit = Boolean(initialData);

  const [formData, setFormData] = useState<FormState>(() => {
    const initialStatus: TaskStatus = initialData?.status || "not_started";
    let initialProgress = 0;

    if (initialData) {
      if (initialStatus === "completed") {
        initialProgress = 100;
      } else if (initialStatus === "not_started") {
        initialProgress = 0;
      } else if (initialStatus === "in_progress") {
        initialProgress = Math.min(Math.max(initialData.progress, 1), 99);
      } else {
        // on_hold or blocked
        initialProgress = Math.min(Math.max(initialData.progress, 0), 99);
      }
    }

    return {
      title: initialData?.title || "",
      description: initialData?.description || "",
      status: initialStatus,
      progress: initialProgress,
      priority: initialData?.priority || "medium",
      assigned_worker_id: initialData?.assigned_worker_id
        ? String(initialData.assigned_worker_id)
        : "",
      start_date: initialData?.start_date || "",
      due_date: initialData?.due_date || "",
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStatusChange = (newStatus: TaskStatus) => {
    setFormData((prev) => {
      let nextProgress = prev.progress;

      if (newStatus === "not_started") {
        nextProgress = 0;
      } else if (newStatus === "completed") {
        nextProgress = 100;
      } else if (newStatus === "in_progress") {
        if (prev.progress <= 0 || prev.progress >= 100) {
          nextProgress = 1;
        } else {
          nextProgress = Math.min(Math.max(prev.progress, 1), 99);
        }
      } else if (newStatus === "on_hold" || newStatus === "blocked") {
        if (prev.progress >= 100) {
          nextProgress = 99;
        }
      }

      return {
        ...prev,
        status: newStatus,
        progress: nextProgress,
      };
    });

    if (errors.status || errors.progress) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.status;
        delete next.progress;
        return next;
      });
    }
  };

  const handleProgressChange = (val: number) => {
    // Slider is only editable during in_progress (1..99)
    const clamped = Math.min(Math.max(val, 1), 99);
    setFormData((prev) => ({ ...prev, progress: clamped }));

    if (errors.progress) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.progress;
        return next;
      });
    }
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      newErrors.title = "Task title is required.";
    } else if (trimmedTitle.length < 2) {
      newErrors.title = "Task title must be at least 2 characters.";
    } else if (trimmedTitle.length > 200) {
      newErrors.title = "Task title cannot exceed 200 characters.";
    }

    if (formData.status === "not_started" && formData.progress !== 0) {
      newErrors.progress = "Tasks that are not started must have 0% progress.";
    } else if (formData.status === "completed" && formData.progress !== 100) {
      newErrors.progress = "A completed task must have 100% progress.";
    } else if (
      formData.status === "in_progress" &&
      (formData.progress < 1 || formData.progress > 99)
    ) {
      newErrors.progress =
        "In-progress tasks must have progress between 1% and 99%.";
    } else if (
      (formData.status === "on_hold" || formData.status === "blocked") &&
      (formData.progress < 0 || formData.progress > 99)
    ) {
      newErrors.progress = "Progress cannot exceed 99% for non-completed tasks.";
    }

    if (formData.start_date && formData.due_date) {
      if (new Date(formData.due_date) < new Date(formData.start_date)) {
        newErrors.due_date = "Due date cannot be earlier than start date.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setGeneralError(null);

    const workerId = formData.assigned_worker_id
      ? parseInt(formData.assigned_worker_id, 10)
      : null;

    let finalProgress = formData.progress;
    if (formData.status === "not_started") finalProgress = 0;
    if (formData.status === "completed") finalProgress = 100;

    const payload: CreateTaskPayload | UpdateTaskPayload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      status: formData.status,
      progress: finalProgress,
      priority: formData.priority,
      assigned_worker_id: workerId,
      start_date: formData.start_date || null,
      due_date: formData.due_date || null,
    };

    try {
      if (isEdit && initialData) {
        const res = await api.put<TaskResponseData>(
          `/tasks/${initialData.id}`,
          payload
        );
        onSuccess(res.task);
        onClose();
      } else {
        const res = await api.post<TaskResponseData>(
          `/phases/${phaseId}/tasks`,
          payload
        );
        onSuccess(res.task);
        onClose();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setGeneralError(err.message);
      } else {
        setGeneralError("An unexpected error occurred while saving the task.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProgressEditable = formData.status === "in_progress";
  const helperText = getProgressHelperText(formData.status);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {generalError && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
          <svg
            className="w-4 h-4 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="flex-1 font-medium leading-relaxed">{generalError}</div>
        </div>
      )}

      {/* Task Title */}
      <div>
        <Input
          id="task-title"
          label="Task Title"
          placeholder="e.g. Pour concrete foundation slab"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          error={errors.title}
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Description & Notes */}
      <div>
        <Textarea
          id="task-description"
          label="Description & Notes"
          placeholder="Provide specifications, site safety guidelines, or material tolerances..."
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          disabled={isSubmitting}
          rows={2}
        />
      </div>

      {/* Status & Priority (2 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="task-status"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Status
          </label>
          <select
            id="task-status"
            value={formData.status}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
          >
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="task-priority"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Priority
          </label>
          <select
            id="task-priority"
            value={formData.priority}
            onChange={(e) => handleChange("priority", e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Execution Progress */}
      <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="flex items-center justify-between">
          <label
            htmlFor="task-progress"
            className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Execution Progress
          </label>
          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
            {formData.progress}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="task-progress"
            type="range"
            min={1}
            max={99}
            step={1}
            value={isProgressEditable ? formData.progress : formData.progress}
            onChange={(e) => handleProgressChange(parseInt(e.target.value, 10))}
            disabled={isSubmitting || !isProgressEditable}
            className="w-full accent-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {helperText}
        </p>

        {errors.progress && (
          <p className="text-xs font-medium text-red-500">{errors.progress}</p>
        )}
      </div>

      {/* Assigned Worker */}
      <div>
        <label
          htmlFor="task-worker"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
        >
          Assigned Worker
        </label>
        <select
          id="task-worker"
          value={formData.assigned_worker_id}
          onChange={(e) => handleChange("assigned_worker_id", e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
        >
          <option value="">-- Unassigned --</option>
          {workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name}
              {worker.worker_type ? ` — ${worker.worker_type}` : ""}
              {!worker.is_active ? " (Inactive)" : ""}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          Workers from your organization can be assigned to execute this task.
        </p>
      </div>

      {/* Start Date & Due Date (2 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="task-start-date"
          type="date"
          label="Start Date"
          value={formData.start_date}
          onChange={(e) => handleChange("start_date", e.target.value)}
          disabled={isSubmitting}
        />
        <Input
          id="task-due-date"
          type="date"
          label="Due Date"
          value={formData.due_date}
          onChange={(e) => handleChange("due_date", e.target.value)}
          error={errors.due_date}
          disabled={isSubmitting}
        />
      </div>

      {/* Actions */}
      <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          {isEdit ? "Update Task" : "Create Task"}
        </Button>
      </div>
    </form>
  );
}

export function TaskFormModal({
  isOpen,
  onClose,
  phaseId,
  phaseName,
  initialData,
  workers,
  onSuccess,
}: TaskFormModalProps) {
  const isEdit = Boolean(initialData);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Task" : "Create New Task"}
      description={
        phaseName
          ? `Phase: ${phaseName}`
          : "Define site deliverables, schedule, and workforce assignment."
      }
      maxWidth="lg"
    >
      {isOpen && (
        <TaskFormContent
          key={initialData ? `edit-${initialData.id}` : `create-${phaseId}`}
          onClose={onClose}
          phaseId={phaseId}
          initialData={initialData}
          workers={workers}
          onSuccess={onSuccess}
        />
      )}
    </Modal>
  );
}
