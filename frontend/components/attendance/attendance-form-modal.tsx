"use client";

import React, { useState, useEffect } from "react";
import {
  Attendance,
  AttendanceStatus,
  Worker,
  CreateAttendancePayload,
  UpdateAttendancePayload,
  AttendanceResponseData,
  WorkersResponseData,
} from "@/types";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface AttendanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  initialData?: Attendance | null;
  workers?: Worker[];
  onSuccess: (attendance: Attendance) => void;
}

interface FormState {
  worker_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  check_in: string;
  check_out: string;
  notes: string;
}

interface AttendanceFormContentProps {
  onClose: () => void;
  projectId: number;
  initialData?: Attendance | null;
  passedWorkers?: Worker[];
  onSuccess: (attendance: Attendance) => void;
}

function getTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeTimeForInput(timeStr?: string | null): string {
  if (!timeStr) return "";
  // If HH:MM:SS, extract HH:MM for <input type="time">
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return timeStr;
}

function formatTimeForPayload(timeStr?: string): string | null {
  if (!timeStr || !timeStr.trim()) return null;
  const trimmed = timeStr.trim();
  // Ensure HH:MM:SS
  if (trimmed.split(":").length === 2) {
    return `${trimmed}:00`;
  }
  return trimmed;
}

function AttendanceFormContent({
  onClose,
  projectId,
  initialData,
  passedWorkers,
  onSuccess,
}: AttendanceFormContentProps) {
  const isEdit = Boolean(initialData);

  const [workers, setWorkers] = useState<Worker[]>(passedWorkers || []);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(!passedWorkers || passedWorkers.length === 0);

  const [formData, setFormData] = useState<FormState>(() => ({
    worker_id: initialData ? String(initialData.worker_id) : "",
    attendance_date: initialData ? initialData.attendance_date : getTodayISODate(),
    status: initialData ? initialData.status : "present",
    check_in: normalizeTimeForInput(initialData?.check_in),
    check_out: normalizeTimeForInput(initialData?.check_out),
    notes: initialData?.notes || "",
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (passedWorkers && passedWorkers.length > 0) {
      return;
    }

    let isSubscribed = true;
    api
      .get<WorkersResponseData>("/workers")
      .then((res) => {
        if (isSubscribed) {
          setWorkers(res.workers || []);
          setIsLoadingWorkers(false);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setIsLoadingWorkers(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [passedWorkers]);

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

    if (!isEdit) {
      if (!formData.worker_id) {
        newErrors.worker_id = "Please select a worker.";
      }
      if (!formData.attendance_date) {
        newErrors.attendance_date = "Attendance date is required.";
      }
    }

    if (formData.check_in && formData.check_out) {
      if (formData.check_out < formData.check_in) {
        newErrors.check_out = "Check-out time cannot be earlier than check-in time.";
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

    const checkInPayload = formatTimeForPayload(formData.check_in);
    const checkOutPayload = formatTimeForPayload(formData.check_out);
    const notesPayload = formData.notes.trim() || null;

    try {
      if (isEdit && initialData) {
        const payload: UpdateAttendancePayload = {
          status: formData.status,
          check_in: checkInPayload,
          check_out: checkOutPayload,
          notes: notesPayload,
        };

        const res = await api.put<AttendanceResponseData>(
          `/attendance/${initialData.id}`,
          payload
        );
        onSuccess(res.attendance);
        onClose();
      } else {
        const workerId = parseInt(formData.worker_id, 10);
        const payload: CreateAttendancePayload = {
          worker_id: workerId,
          project_id: projectId,
          attendance_date: formData.attendance_date,
          status: formData.status,
          check_in: checkInPayload,
          check_out: checkOutPayload,
          notes: notesPayload,
        };

        const res = await api.post<AttendanceResponseData>(
          "/attendance",
          payload
        );
        onSuccess(res.attendance);
        onClose();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && typeof err.details === "object") {
          const fieldErrors: Record<string, string> = {};
          for (const [key, msg] of Object.entries(err.details)) {
            fieldErrors[key] = Array.isArray(msg) ? msg[0] : String(msg);
          }
          setErrors(fieldErrors);
        }
        setGeneralError(err.message);
      } else {
        setGeneralError("An unexpected error occurred while saving attendance.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedWorker = initialData
    ? workers.find((w) => w.id === initialData.worker_id)
    : null;

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

      {/* Worker selection (Create only) or Worker Name Display (Edit) */}
      {!isEdit ? (
        <div>
          <label
            htmlFor="attendance-worker"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Worker
          </label>
          <select
            id="attendance-worker"
            value={formData.worker_id}
            onChange={(e) => handleChange("worker_id", e.target.value)}
            disabled={isSubmitting || isLoadingWorkers}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
          >
            <option value="">
              {isLoadingWorkers ? "-- Loading workers... --" : "-- Select Worker --"}
            </option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} {w.worker_type ? `(${w.worker_type})` : ""} {!w.is_active ? "- Inactive" : ""}
              </option>
            ))}
          </select>
          {errors.worker_id && (
            <p className="text-xs font-medium text-red-500 mt-1">{errors.worker_id}</p>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Worker & Date
          </span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {selectedWorker ? selectedWorker.name : `Worker #${initialData?.worker_id}`}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {formatDate(initialData?.attendance_date)}
            </span>
          </div>
        </div>
      )}

      {/* Attendance Date & Status (2 columns on create, Status only on edit) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!isEdit && (
          <Input
            id="attendance-date"
            type="date"
            label="Attendance Date"
            value={formData.attendance_date}
            onChange={(e) => handleChange("attendance_date", e.target.value)}
            error={errors.attendance_date}
            required
            disabled={isSubmitting}
          />
        )}

        <div className={isEdit ? "sm:col-span-2" : ""}>
          <label
            htmlFor="attendance-status"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Attendance Status
          </label>
          <select
            id="attendance-status"
            value={formData.status}
            onChange={(e) => handleChange("status", e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
          >
            <option value="present">Present (Full Day)</option>
            <option value="half_day">Half Day</option>
            <option value="absent">Absent</option>
            <option value="leave">Leave / Permitted</option>
          </select>
        </div>
      </div>

      {/* Check-In & Check-Out Times (2 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="attendance-check-in"
          type="time"
          label="Check-In Time"
          value={formData.check_in}
          onChange={(e) => handleChange("check_in", e.target.value)}
          disabled={isSubmitting}
        />

        <Input
          id="attendance-check-out"
          type="time"
          label="Check-Out Time"
          value={formData.check_out}
          onChange={(e) => handleChange("check_out", e.target.value)}
          error={errors.check_out}
          disabled={isSubmitting}
        />
      </div>

      {/* Notes */}
      <div>
        <Textarea
          id="attendance-notes"
          label="Notes & Site Remarks"
          placeholder="e.g. Overtime 1.5 hrs, shifted to foundation site at noon..."
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          disabled={isSubmitting}
          rows={3}
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
          {isEdit ? "Update Attendance" : "Record Attendance"}
        </Button>
      </div>
    </form>
  );
}

export function AttendanceFormModal({
  isOpen,
  onClose,
  projectId,
  initialData,
  workers,
  onSuccess,
}: AttendanceFormModalProps) {
  const isEdit = Boolean(initialData);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Attendance Record" : "Record Site Attendance"}
      description={
        isEdit
          ? "Update check-in timestamps, status, or site notes."
          : "Log daily workforce presence and site muster timestamps."
      }
      maxWidth="lg"
    >
      {isOpen && (
        <AttendanceFormContent
          key={initialData ? `edit-${initialData.id}` : `create-${projectId}`}
          onClose={onClose}
          projectId={projectId}
          initialData={initialData}
          passedWorkers={workers}
          onSuccess={onSuccess}
        />
      )}
    </Modal>
  );
}
