"use client";

import React, { useState } from "react";
import { Project, ProjectStatus, CreateProjectPayload, UpdateProjectPayload, ProjectResponseData } from "@/types";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void;
  initialData?: Project | null;
}

interface FormState {
  name: string;
  client_name: string;
  location: string;
  status: ProjectStatus;
  budget: string;
  start_date: string;
  expected_end_date: string;
  actual_end_date: string;
  description: string;
}

interface ProjectFormContentProps {
  initialData?: Project | null;
  onClose: () => void;
  onSuccess: (project: Project) => void;
}

function ProjectFormContent({
  initialData,
  onClose,
  onSuccess,
}: ProjectFormContentProps) {
  const isEdit = !!initialData;
  const [formData, setFormData] = useState<FormState>(() => ({
    name: initialData?.name || "",
    client_name: initialData?.client_name || "",
    location: initialData?.location || "",
    status: initialData?.status || "planning",
    budget: initialData?.budget ? String(initialData.budget) : "0",
    start_date: initialData?.start_date || "",
    expected_end_date: initialData?.expected_end_date || "",
    actual_end_date: initialData?.actual_end_date || "",
    description: initialData?.description || "",
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    field: keyof FormState,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      newErrors.name = "Project name is required.";
    } else if (trimmedName.length < 2) {
      newErrors.name = "Project name must be at least 2 characters.";
    } else if (trimmedName.length > 200) {
      newErrors.name = "Project name cannot exceed 200 characters.";
    }

    if (formData.client_name && formData.client_name.length > 150) {
      newErrors.client_name = "Client name cannot exceed 150 characters.";
    }

    if (formData.location && formData.location.length > 255) {
      newErrors.location = "Location cannot exceed 255 characters.";
    }

    const numericBudget = parseFloat(formData.budget);
    if (isNaN(numericBudget) || numericBudget < 0) {
      newErrors.budget = "Budget must be a valid non-negative number.";
    }

    if (
      formData.start_date &&
      formData.expected_end_date &&
      formData.expected_end_date < formData.start_date
    ) {
      newErrors.expected_end_date = "Expected end date cannot be before start date.";
    }

    if (
      formData.start_date &&
      formData.actual_end_date &&
      formData.actual_end_date < formData.start_date
    ) {
      newErrors.actual_end_date = "Actual end date cannot be before start date.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateProjectPayload | UpdateProjectPayload = {
        name: formData.name.trim(),
        client_name: formData.client_name.trim() || null,
        location: formData.location.trim() || null,
        status: formData.status,
        budget: formData.budget || "0",
        start_date: formData.start_date || null,
        expected_end_date: formData.expected_end_date || null,
        actual_end_date: formData.actual_end_date || null,
        description: formData.description.trim() || null,
      };

      let resultProject: Project;

      if (isEdit && initialData) {
        const response = await api.put<ProjectResponseData>(
          `/projects/${initialData.id}`,
          payload
        );
        resultProject = response.project;
      } else {
        const response = await api.post<ProjectResponseData>(
          "/projects",
          payload
        );
        resultProject = response.project;
      }

      onSuccess(resultProject);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && typeof err.details === "object" && !Array.isArray(err.details)) {
          const detailErrors: Record<string, string> = {};
          for (const [key, val] of Object.entries(err.details)) {
            detailErrors[key] = Array.isArray(val) ? val.join(" ") : String(val);
          }
          setErrors(detailErrors);
        }
        setGeneralError(err.message || "Failed to save project.");
      } else {
        setGeneralError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {generalError && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2"
        >
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>{generalError}</span>
        </div>
      )}

      {/* SECTION 1: CORE DETAILS */}
      <div className="space-y-3.5">
        <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            1. Project Information
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Project Name"
              required
              placeholder="e.g., Riverside Commercial Complex - Tower A"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              error={errors.name}
              maxLength={200}
            />
          </div>

          <div>
            <Input
              label="Client Name"
              placeholder="e.g., Apex Infrastructure Pvt Ltd"
              value={formData.client_name}
              onChange={(e) => handleChange("client_name", e.target.value)}
              error={errors.client_name}
              maxLength={150}
            />
          </div>

          <div>
            <Input
              label="Site Location"
              placeholder="e.g., Sector 62, Noida"
              value={formData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              error={errors.location}
              maxLength={255}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: STATUS & FINANCIALS */}
      <div className="space-y-3.5">
        <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            2. Status & Financials
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="project-status-select"
              className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Project Status <span className="text-amber-500 ml-1">*</span>
            </label>
            <select
              id="project-status-select"
              value={formData.status}
              onChange={(e) =>
                handleChange("status", e.target.value as ProjectStatus)
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <Input
              label="Total Allocated Budget (INR)"
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={formData.budget}
              onChange={(e) => handleChange("budget", e.target.value)}
              error={errors.budget}
              helperText={`Preview: ${formatCurrency(formData.budget)}`}
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: TIMELINE & SCHEDULE */}
      <div className="space-y-3.5">
        <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            3. Timeline & Schedule
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Input
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => handleChange("start_date", e.target.value)}
              error={errors.start_date}
            />
          </div>

          <div>
            <Input
              label="Expected End Date"
              type="date"
              value={formData.expected_end_date}
              onChange={(e) =>
                handleChange("expected_end_date", e.target.value)
              }
              error={errors.expected_end_date}
            />
          </div>

          <div>
            <Input
              label="Actual End Date (Optional)"
              type="date"
              value={formData.actual_end_date}
              onChange={(e) =>
                handleChange("actual_end_date", e.target.value)
              }
              error={errors.actual_end_date}
              helperText="Leave empty until project is fully finished"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: DESCRIPTION & SCOPE */}
      <div className="space-y-3.5">
        <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            4. Scope & Description
          </h4>
        </div>

        <Textarea
          label="Project Description"
          placeholder="Provide architectural scope, structural notes, milestones, or client specifications..."
          rows={3}
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          error={errors.description}
        />
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
        >
          {isEdit ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}

export function ProjectFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: ProjectFormModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Project" : "Create New Project"}
      description={
        initialData
          ? "Update project details, budget, timeline, and operational status."
          : "Define a new construction project and set up initial parameters."
      }
      maxWidth="2xl"
    >
      <ProjectFormContent
        key={initialData ? `edit-${initialData.id}` : "create"}
        initialData={initialData}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
