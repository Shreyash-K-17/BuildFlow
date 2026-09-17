"use client";

import React, { useState } from "react";
import { ProjectPhase, CreatePhasePayload, UpdatePhasePayload, PhaseResponseData } from "@/types";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";

interface PhaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  initialData?: ProjectPhase | null;
  onSuccess: (phase: ProjectPhase) => void;
  suggestedOrder?: number;
}

interface FormState {
  name: string;
  phase_order: string;
  description: string;
}

interface PhaseFormContentProps {
  onClose: () => void;
  projectId: number;
  initialData?: ProjectPhase | null;
  onSuccess: (phase: ProjectPhase) => void;
  suggestedOrder?: number;
}

function PhaseFormContent({
  onClose,
  projectId,
  initialData,
  onSuccess,
  suggestedOrder = 1,
}: PhaseFormContentProps) {
  const isEdit = Boolean(initialData);

  const [formData, setFormData] = useState<FormState>(() => ({
    name: initialData?.name || "",
    phase_order: initialData ? String(initialData.phase_order) : String(suggestedOrder),
    description: initialData?.description || "",
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      newErrors.name = "Phase name is required.";
    } else if (trimmedName.length < 2) {
      newErrors.name = "Phase name must be at least 2 characters.";
    } else if (trimmedName.length > 150) {
      newErrors.name = "Phase name cannot exceed 150 characters.";
    }

    const orderNum = parseInt(formData.phase_order, 10);
    if (isNaN(orderNum) || orderNum < 1) {
      newErrors.phase_order = "Phase order must be a positive number (minimum 1).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setGeneralError(null);

    const phaseOrder = parseInt(formData.phase_order, 10);
    const description = formData.description.trim() || null;

    try {
      if (isEdit && initialData) {
        const payload: UpdatePhasePayload = {
          name: formData.name.trim(),
          phase_order: phaseOrder,
          description,
        };

        const res = await api.put<PhaseResponseData>(
          `/phases/${initialData.id}`,
          payload
        );
        onSuccess(res.phase);
        onClose();
      } else {
        const payload: CreatePhasePayload = {
          name: formData.name.trim(),
          phase_order: phaseOrder,
          description,
        };

        const res = await api.post<PhaseResponseData>(
          `/projects/${projectId}/phases`,
          payload
        );
        onSuccess(res.phase);
        onClose();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setGeneralError(err.message);
      } else {
        setGeneralError("An unexpected error occurred while saving the phase.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {generalError && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
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
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1 font-medium">{generalError}</div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-3">
          <Input
            id="phase-name"
            label="Phase Name"
            placeholder="e.g. Substructure & Foundation"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            error={errors.name}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="sm:col-span-1">
          <Input
            id="phase-order"
            type="number"
            label="Order"
            min="1"
            step="1"
            placeholder="1"
            value={formData.phase_order}
            onChange={(e) => handleChange("phase_order", e.target.value)}
            error={errors.phase_order}
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div>
        <Textarea
          id="phase-description"
          label="Description"
          placeholder="Outline the milestones, contractor scope, and site deliverables for this phase..."
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          disabled={isSubmitting}
          rows={3}
        />
      </div>

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
          {isEdit ? "Update Phase" : "Create Phase"}
        </Button>
      </div>
    </form>
  );
}

export function PhaseFormModal({
  isOpen,
  onClose,
  projectId,
  initialData,
  onSuccess,
  suggestedOrder = 1,
}: PhaseFormModalProps) {
  const isEdit = Boolean(initialData);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Phase" : "Create New Phase"}
      description={
        isEdit
          ? "Update the execution phase details for this project."
          : "Add a structured work breakdown phase to organize project execution."
      }
      maxWidth="md"
    >
      {isOpen && (
        <PhaseFormContent
          key={initialData ? `edit-${initialData.id}` : `create-${suggestedOrder}`}
          onClose={onClose}
          projectId={projectId}
          initialData={initialData}
          onSuccess={onSuccess}
          suggestedOrder={suggestedOrder}
        />
      )}
    </Modal>
  );
}
