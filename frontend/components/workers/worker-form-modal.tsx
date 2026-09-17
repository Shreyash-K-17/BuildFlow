"use client";

import React, { useState } from "react";
import {
  Worker,
  CreateWorkerPayload,
  UpdateWorkerPayload,
  WorkerResponseData,
} from "@/types";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";

interface WorkerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Worker | null;
  onSuccess: (worker: Worker) => void;
}

interface FormState {
  username: string;
  email: string;
  password: string;
  full_name: string;
  phone: string;
  worker_type: string;
  daily_wage: string;
  is_active: boolean;
}

interface WorkerFormContentProps {
  onClose: () => void;
  initialData?: Worker | null;
  onSuccess: (worker: Worker) => void;
}

const COMMON_TRADES = [
  "Mason",
  "Carpenter",
  "Electrician",
  "Plumber",
  "Welder",
  "Painter",
  "Steel Fixer",
  "Site Supervisor",
  "Heavy Equipment Operator",
  "General Laborer",
];

function WorkerFormContent({
  onClose,
  initialData,
  onSuccess,
}: WorkerFormContentProps) {
  const isEdit = Boolean(initialData);

  const [formData, setFormData] = useState<FormState>(() => ({
    username: "",
    email: initialData?.email || "",
    password: "",
    full_name: initialData?.name || "",
    phone: initialData?.phone || "",
    worker_type: initialData?.worker_type || "",
    daily_wage: initialData?.daily_wage ? String(initialData.daily_wage) : "",
    is_active: initialData?.is_active ?? true,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof FormState, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const trimmedFullName = formData.full_name.trim();
    if (!trimmedFullName) {
      newErrors.full_name = "Full name is required.";
    } else if (trimmedFullName.length < 2) {
      newErrors.full_name = "Full name must be at least 2 characters.";
    } else if (trimmedFullName.length > 150) {
      newErrors.full_name = "Full name cannot exceed 150 characters.";
    }

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!isEdit) {
      const trimmedUsername = formData.username.trim();
      if (!trimmedUsername) {
        newErrors.username = "Username is required for worker login.";
      } else if (trimmedUsername.length < 3) {
        newErrors.username = "Username must be at least 3 characters.";
      } else if (trimmedUsername.length > 80) {
        newErrors.username = "Username cannot exceed 80 characters.";
      }

      const pass = formData.password;
      if (!pass) {
        newErrors.password = "Password is required for worker login.";
      } else if (pass.length < 8) {
        newErrors.password = "Password must be at least 8 characters.";
      } else if (!/[A-Z]/.test(pass)) {
        newErrors.password = "Password must contain at least one uppercase letter.";
      } else if (!/[a-z]/.test(pass)) {
        newErrors.password = "Password must contain at least one lowercase letter.";
      } else if (!/[0-9]/.test(pass)) {
        newErrors.password = "Password must contain at least one number.";
      }
    } else {
      if (formData.username.trim() && formData.username.trim().length < 3) {
        newErrors.username = "Username must be at least 3 characters.";
      }
    }

    if (formData.daily_wage.trim()) {
      const wageNum = parseFloat(formData.daily_wage);
      if (isNaN(wageNum) || wageNum < 0) {
        newErrors.daily_wage = "Daily wage must be a non-negative number.";
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

    const wageValue = formData.daily_wage.trim()
      ? parseFloat(formData.daily_wage)
      : null;

    try {
      if (isEdit && initialData) {
        const payload: UpdateWorkerPayload = {
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          worker_type: formData.worker_type.trim() || null,
          daily_wage: wageValue,
          is_active: formData.is_active,
        };

        if (formData.username.trim()) {
          payload.username = formData.username.trim();
        }

        const res = await api.put<WorkerResponseData>(
          `/workers/${initialData.id}`,
          payload
        );
        onSuccess(res.worker);
        onClose();
      } else {
        const payload: CreateWorkerPayload = {
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || null,
          worker_type: formData.worker_type.trim() || null,
          daily_wage: wageValue,
        };

        const res = await api.post<WorkerResponseData>("/workers", payload);
        onSuccess(res.worker);
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
        setGeneralError("An unexpected error occurred while saving the worker.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Full Name & Phone (2 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="worker-full-name"
          label="Full Name"
          placeholder="e.g. Rajesh Kumar"
          value={formData.full_name}
          onChange={(e) => handleChange("full_name", e.target.value)}
          error={errors.full_name}
          required
          disabled={isSubmitting}
        />

        <Input
          id="worker-phone"
          label="Phone Number"
          placeholder="+91 98765 43210"
          value={formData.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          error={errors.phone}
          disabled={isSubmitting}
        />
      </div>

      {/* Email & Username */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="worker-email"
          type="email"
          label="Email Address"
          placeholder="rajesh@buildflow.site"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          error={errors.email}
          required
          disabled={isSubmitting}
        />

        <Input
          id="worker-username"
          label={isEdit ? "Username (Optional to Change)" : "Login Username"}
          placeholder="rajesh_mason"
          value={formData.username}
          onChange={(e) => handleChange("username", e.target.value)}
          error={errors.username}
          required={!isEdit}
          disabled={isSubmitting}
        />
      </div>

      {/* Password (Only on Create) */}
      {!isEdit && (
        <div>
          <Input
            id="worker-password"
            type="password"
            label="Account Password"
            placeholder="Min 8 chars (upper, lower, number)"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            error={errors.password}
            required
            disabled={isSubmitting}
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            This password will allow the worker to sign in and view their assigned tasks.
          </p>
        </div>
      )}

      {/* Trade / Specialty & Daily Wage (2 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="worker-trade"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Trade / Specialty
          </label>
          <input
            id="worker-trade"
            list="worker-trades-list"
            type="text"
            placeholder="e.g. Mason, Electrician"
            value={formData.worker_type}
            onChange={(e) => handleChange("worker_type", e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
          />
          <datalist id="worker-trades-list">
            {COMMON_TRADES.map((trade) => (
              <option key={trade} value={trade} />
            ))}
          </datalist>
        </div>

        <Input
          id="worker-daily-wage"
          type="number"
          step="0.01"
          min="0"
          label="Daily Wage (₹ INR)"
          placeholder="e.g. 850"
          value={formData.daily_wage}
          onChange={(e) => handleChange("daily_wage", e.target.value)}
          error={errors.daily_wage}
          disabled={isSubmitting}
        />
      </div>

      {/* Active / Inactive Toggle (On Edit) */}
      {isEdit && (
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label
                htmlFor="worker-active-toggle"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block cursor-pointer"
              >
                Account Active Status
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {formData.is_active
                  ? "Worker is active and can be assigned tasks and record attendance."
                  : "Deactivating will disable this worker's login and prevent new task assignments."}
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                id="worker-active-toggle"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
                disabled={isSubmitting}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>
      )}

      {/* Action Buttons */}
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
          {isEdit ? "Update Worker" : "Create Worker"}
        </Button>
      </div>
    </form>
  );
}

export function WorkerFormModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: WorkerFormModalProps) {
  const isEdit = Boolean(initialData);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Worker Profile" : "Add New Worker"}
      description={
        isEdit
          ? `Update details and active login status for ${initialData?.name || "worker"}.`
          : "Register a workforce member with linked credentials for field access."
      }
      maxWidth="lg"
    >
      {isOpen && (
        <WorkerFormContent
          key={initialData ? `edit-${initialData.id}` : "create-new"}
          onClose={onClose}
          initialData={initialData}
          onSuccess={onSuccess}
        />
      )}
    </Modal>
  );
}
