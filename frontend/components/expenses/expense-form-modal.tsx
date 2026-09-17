"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import {
  Expense,
  Project,
  CreateExpensePayload,
  UpdateExpensePayload,
} from "@/types";
import { EXPENSE_CATEGORIES } from "./expense-category-badge";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Expense | null;
  projectId?: number;
  projects: Project[];
}

interface ExpenseFormContentProps {
  initialData?: Expense | null;
  projectId?: number;
  projects: Project[];
  onClose: () => void;
  onSuccess: () => void;
}

function ExpenseFormContent({
  initialData,
  projectId,
  projects,
  onClose,
  onSuccess,
}: ExpenseFormContentProps) {
  const isEdit = Boolean(initialData);

  const getInitialDate = (): string => {
    if (initialData?.expense_date) {
      return initialData.expense_date.split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  };

  const [selectedProjectId, setSelectedProjectId] = useState<number>(
    initialData?.project_id || projectId || (projects.length > 0 ? projects[0].id : 0)
  );
  const [category, setCategory] = useState<string>(
    initialData?.category || "Materials"
  );
  const [customCategory, setCustomCategory] = useState<string>("");
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(() => {
    if (!initialData?.category) return false;
    return !(EXPENSE_CATEGORIES as readonly string[]).includes(initialData.category);
  });
  const [description, setDescription] = useState<string>(
    initialData?.description || ""
  );
  const [amount, setAmount] = useState<string>(
    initialData?.amount ? String(initialData.amount) : ""
  );
  const [expenseDate, setExpenseDate] = useState<string>(getInitialDate);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const activeCategory = isCustomCategory ? customCategory : category;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isEdit && (!selectedProjectId || selectedProjectId <= 0)) {
      newErrors.project_id = "Please select a construction project.";
    }

    const cat = activeCategory.trim();
    if (!cat) {
      newErrors.category = "Expense category is required.";
    } else if (cat.length < 2 || cat.length > 100) {
      newErrors.category = "Category must be between 2 and 100 characters.";
    }

    const desc = description.trim();
    if (!desc) {
      newErrors.description = "Expense description is required.";
    } else if (desc.length > 255) {
      newErrors.description = "Description must not exceed 255 characters.";
    }

    const amtNum = parseFloat(amount);
    if (!amount.trim()) {
      newErrors.amount = "Expense amount is required.";
    } else if (isNaN(amtNum) || amtNum <= 0) {
      newErrors.amount = "Amount must be greater than zero.";
    }

    if (!expenseDate) {
      newErrors.expense_date = "Expense date is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      if (isEdit && initialData) {
        const payload: UpdateExpensePayload = {
          category: activeCategory.trim(),
          description: description.trim(),
          amount: parseFloat(amount),
          expense_date: expenseDate,
        };

        await api.put<{ expense: Expense }>(
          `/expenses/${initialData.id}`,
          payload
        );
      } else {
        const payload: CreateExpensePayload = {
          project_id: selectedProjectId,
          category: activeCategory.trim(),
          description: description.trim(),
          amount: parseFloat(amount),
          expense_date: expenseDate,
        };

        await api.post<{ expense: Expense }>("/expenses", payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && typeof err.details === "object") {
          const detailObj = err.details as Record<string, unknown>;
          const fieldErrs: Record<string, string> = {};
          for (const [k, v] of Object.entries(detailObj)) {
            fieldErrs[k] = Array.isArray(v) ? v.join(" ") : String(v);
          }
          setErrors(fieldErrs);
        }
        setApiError(err.message || "Failed to record project expense.");
      } else {
        setApiError("A network error occurred. Please verify connectivity.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-slate-900 dark:text-slate-100">
      {apiError && (
        <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-600 dark:text-red-300 flex items-start gap-2 animate-in fade-in">
          <svg
            className="w-4 h-4 text-red-500 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{apiError}</span>
        </div>
      )}

      {/* Project Selector (Disabled on Edit) */}
      <div className="space-y-1.5">
        <label
          htmlFor="expense-project"
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          Construction Project <span className="text-amber-500">*</span>
        </label>
        {isEdit ? (
          <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-800 dark:text-slate-300 font-medium">
            {selectedProject ? selectedProject.name : `Project #${selectedProjectId}`}
            <span className="ml-2 text-[10px] text-slate-500 font-normal">
              (Project cannot be changed on existing expense)
            </span>
          </div>
        ) : (
          <select
            id="expense-project"
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(Number(e.target.value));
              if (errors.project_id) {
                setErrors((prev) => ({ ...prev, project_id: "" }));
              }
            }}
            className="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors cursor-pointer"
          >
            {projects.length === 0 ? (
              <option value="0">No projects available</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status.toUpperCase()})
                </option>
              ))
            )}
          </select>
        )}
        {errors.project_id && (
          <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">{errors.project_id}</p>
        )}
      </div>

      {/* Category Selection */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="expense-category"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Expense Category <span className="text-amber-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => {
              setIsCustomCategory(!isCustomCategory);
              if (!isCustomCategory) {
                setCustomCategory("");
              }
            }}
            className="text-[11px] text-amber-600 dark:text-amber-500 hover:text-amber-500 hover:underline transition-colors font-medium cursor-pointer"
          >
            {isCustomCategory ? "Choose Preset" : "+ Custom Category"}
          </button>
        </div>

        {isCustomCategory ? (
          <Input
            id="expense-custom-category"
            type="text"
            placeholder="e.g. Scaffolding Rental, Fuel"
            value={customCategory}
            error={errors.category}
            onChange={(e) => {
              setCustomCategory(e.target.value);
              if (errors.category) {
                setErrors((prev) => ({ ...prev, category: "" }));
              }
            }}
          />
        ) : (
          <select
            id="expense-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              if (errors.category) {
                setErrors((prev) => ({ ...prev, category: "" }));
              }
            }}
            className="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors cursor-pointer"
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
        {errors.category && !isCustomCategory && (
          <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">{errors.category}</p>
        )}
      </div>

      {/* Description */}
      <Input
        id="expense-description"
        type="text"
        label="Description / Purpose"
        required
        placeholder="e.g. Concrete mix batch #4 for foundation slab"
        value={description}
        error={errors.description}
        helperText="Brief summary of what was purchased or disbursed."
        onChange={(e) => {
          setDescription(e.target.value);
          if (errors.description) {
            setErrors((prev) => ({ ...prev, description: "" }));
          }
        }}
      />

      {/* Amount & Date 2-Column Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="expense-amount"
          type="number"
          step="0.01"
          min="0.01"
          label="Amount (₹ INR)"
          required
          placeholder="0.00"
          value={amount}
          error={errors.amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (errors.amount) {
              setErrors((prev) => ({ ...prev, amount: "" }));
            }
          }}
        />

        <Input
          id="expense-date"
          type="date"
          label="Expense Date"
          required
          value={expenseDate}
          error={errors.expense_date}
          onChange={(e) => {
            setExpenseDate(e.target.value);
            if (errors.expense_date) {
              setErrors((prev) => ({ ...prev, expense_date: "" }));
            }
          }}
        />
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-3">
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
          {isEdit ? "Save Changes" : "Record Expense"}
        </Button>
      </div>
    </form>
  );
}

export function ExpenseFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  projectId,
  projects,
}: ExpenseFormModalProps) {
  const isEdit = Boolean(initialData);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Site Expense" : "Record New Expense"}
      description={
        isEdit
          ? "Update category, amount, or remarks for this financial disbursement."
          : "Log a site expenditure, contractor payment, or equipment rental against a project."
      }
      maxWidth="md"
    >
      <ExpenseFormContent
        key={initialData?.id ?? `new-${projectId ?? 0}`}
        initialData={initialData}
        projectId={projectId}
        projects={projects}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
