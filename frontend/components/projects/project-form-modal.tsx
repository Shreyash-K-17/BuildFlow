"use client";

import React, { useState } from "react";
import { Project, ProjectStatus, CreateProjectPayload, UpdateProjectPayload, ProjectResponseData } from "@/types";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import {
  BudgetUnit,
  convertBudgetToRupees,
  getSensibleBudgetUnit,
  BUDGET_UNIT_MULTIPLIERS,
  formatCurrency,
  formatCompactCurrency,
} from "@/lib/utils";

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
  budgetAmount: string;
  budgetUnit: BudgetUnit;
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

  const [formData, setFormData] = useState<FormState>(() => {
    const rawBudget = initialData?.budget ? parseFloat(initialData.budget) : 0;
    const sensible = getSensibleBudgetUnit(rawBudget);

    return {
      name: initialData?.name || "",
      client_name: initialData?.client_name || "",
      location: initialData?.location || "",
      status: initialData?.status || "planning",
      budgetAmount:
        isNaN(rawBudget) || rawBudget <= 0 ? "0" : sensible.amount,
      budgetUnit:
        isNaN(rawBudget) || rawBudget <= 0 ? "lakh" : sensible.unit,
      start_date: initialData?.start_date || "",
      expected_end_date: initialData?.expected_end_date || "",
      actual_end_date: initialData?.actual_end_date || "",
      description: initialData?.description || "",
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculatedRupees = convertBudgetToRupees(
    formData.budgetAmount,
    formData.budgetUnit
  );

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

  const handleUnitChange = (newUnit: BudgetUnit) => {
    const currentRupees = convertBudgetToRupees(
      formData.budgetAmount,
      formData.budgetUnit
    );

    if (currentRupees > 0) {
      const newMultiplier = BUDGET_UNIT_MULTIPLIERS[newUnit] || 1;
      const newAmount = currentRupees / newMultiplier;
      setFormData((prev) => ({
        ...prev,
        budgetUnit: newUnit,
        budgetAmount: String(Number(newAmount.toFixed(4))),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        budgetUnit: newUnit,
      }));
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

    const numericAmount = parseFloat(formData.budgetAmount);
    if (isNaN(numericAmount) || numericAmount < 0 || !isFinite(numericAmount)) {
      newErrors.budget = "Budget amount must be a valid non-negative number.";
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
      const finalBudget = convertBudgetToRupees(
        formData.budgetAmount,
        formData.budgetUnit
      );

      const payload: CreateProjectPayload | UpdateProjectPayload = {
        name: formData.name.trim(),
        client_name: formData.client_name.trim() || null,
        location: formData.location.trim() || null,
        status: formData.status,
        budget: finalBudget,
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
            <label
              htmlFor="project-budget-input"
              className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5"
            >
              Allocated Budget (INR) <span className="text-amber-500 ml-1">*</span>
            </label>
            <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-2 focus-within:ring-amber-500/50 focus-within:border-amber-500 transition-all">
              <div className="flex items-center pl-3 pr-1 text-slate-400 font-semibold text-sm select-none">
                ₹
              </div>
              <input
                id="project-budget-input"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={formData.budgetAmount}
                onChange={(e) => handleChange("budgetAmount", e.target.value)}
                className="w-full bg-transparent px-2 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
              <select
                id="project-budget-unit-select"
                value={formData.budgetUnit}
                onChange={(e) => handleUnitChange(e.target.value as BudgetUnit)}
                aria-label="Budget denomination unit"
                className="border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="crore">Crore (Cr)</option>
                <option value="lakh">Lakh</option>
                <option value="thousand">Thousand</option>
                <option value="rupees">Rupees (₹)</option>
              </select>
            </div>
            {errors.budget ? (
              <p className="text-xs font-medium text-red-500 mt-1.5">
                {errors.budget}
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between">
                <span>
                  Preview:{" "}
                  <strong className="text-amber-600 dark:text-amber-400 font-semibold">
                    {formatCurrency(calculatedRupees)}
                  </strong>
                </span>
                {calculatedRupees > 0 && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    ({formatCompactCurrency(calculatedRupees)})
                  </span>
                )}
              </p>
            )}
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
