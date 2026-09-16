"use client";

import React, { useState } from "react";
import {
  Material,
  CreateMaterialPayload,
  UpdateMaterialPayload,
  MaterialResponseData,
} from "@/types";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Material | null;
  onSuccess: (material: Material) => void;
}

interface FormState {
  name: string;
  unit: string;
  current_stock: string;
  minimum_stock: string;
  unit_cost: string;
}

const COMMON_UNITS = [
  "bags",
  "tonnes",
  "kg",
  "cu.m",
  "sq.m",
  "litres",
  "pieces",
  "meters",
  "feet",
  "boxes",
  "bundles",
];

function MaterialFormContent({
  onClose,
  initialData,
  onSuccess,
}: {
  onClose: () => void;
  initialData?: Material | null;
  onSuccess: (material: Material) => void;
}) {
  const isEdit = Boolean(initialData);

  const [formData, setFormData] = useState<FormState>(() => ({
    name: initialData?.name || "",
    unit: initialData?.unit || "",
    current_stock: initialData?.current_stock || "0",
    minimum_stock: initialData?.minimum_stock || "0",
    unit_cost:
      initialData?.unit_cost !== null && initialData?.unit_cost !== undefined
        ? String(initialData.unit_cost)
        : "",
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    if (generalError) {
      setGeneralError(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      newErrors.name = "Material name is required.";
    } else if (trimmedName.length < 2 || trimmedName.length > 150) {
      newErrors.name = "Material name must be between 2 and 150 characters.";
    }

    const trimmedUnit = formData.unit.trim();
    if (!trimmedUnit) {
      newErrors.unit = "Measurement unit is required.";
    } else if (trimmedUnit.length < 1 || trimmedUnit.length > 30) {
      newErrors.unit = "Unit must be between 1 and 30 characters.";
    }

    if (!isEdit) {
      const currentStockNum = parseFloat(formData.current_stock);
      if (isNaN(currentStockNum) || currentStockNum < 0) {
        newErrors.current_stock = "Initial current stock must be 0 or greater.";
      }
    }

    const minStockNum = parseFloat(formData.minimum_stock);
    if (isNaN(minStockNum) || minStockNum < 0) {
      newErrors.minimum_stock = "Minimum threshold stock must be 0 or greater.";
    }

    if (formData.unit_cost.trim() !== "") {
      const unitCostNum = parseFloat(formData.unit_cost);
      if (isNaN(unitCostNum) || unitCostNum < 0) {
        newErrors.unit_cost = "Unit cost must be a positive number.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) return;

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      if (isEdit && initialData) {
        const payload: UpdateMaterialPayload = {
          name: formData.name.trim(),
          unit: formData.unit.trim(),
          minimum_stock: parseFloat(formData.minimum_stock) || 0,
          unit_cost:
            formData.unit_cost.trim() !== ""
              ? parseFloat(formData.unit_cost)
              : null,
        };

        const resp = await api.put<MaterialResponseData>(
          `/materials/${initialData.id}`,
          payload
        );
        onSuccess(resp.material);
        onClose();
      } else {
        const payload: CreateMaterialPayload = {
          name: formData.name.trim(),
          unit: formData.unit.trim(),
          current_stock: parseFloat(formData.current_stock) || 0,
          minimum_stock: parseFloat(formData.minimum_stock) || 0,
          unit_cost:
            formData.unit_cost.trim() !== ""
              ? parseFloat(formData.unit_cost)
              : null,
        };

        const resp = await api.post<MaterialResponseData>(
          "/materials",
          payload
        );
        onSuccess(resp.material);
        onClose();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && typeof err.details === "object") {
          const fieldErrors: Record<string, string> = {};
          for (const [key, val] of Object.entries(err.details)) {
            if (Array.isArray(val) && val.length > 0) {
              fieldErrors[key] = String(val[0]);
            } else if (typeof val === "string") {
              fieldErrors[key] = val;
            }
          }
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
          }
        }
        setGeneralError(err.message || "Failed to save material.");
      } else {
        setGeneralError("An unexpected network error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {generalError && (
        <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-xs text-red-600 dark:text-red-400">
          {generalError}
        </div>
      )}

      {/* Material Name */}
      <div>
        <label
          htmlFor="material-name"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
        >
          Material Name <span className="text-red-500">*</span>
        </label>
        <Input
          id="material-name"
          type="text"
          placeholder="e.g. Cement (50kg OPC), TMT Steel 12mm, Red Bricks"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          disabled={isSubmitting}
          error={errors.name}
        />
      </div>

      {/* Measurement Unit */}
      <div>
        <label
          htmlFor="material-unit"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
        >
          Unit of Measurement <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <Input
            id="material-unit"
            type="text"
            placeholder="e.g. bags, tonnes, kg, cu.m, sq.m, pieces"
            value={formData.unit}
            onChange={(e) => handleChange("unit", e.target.value)}
            disabled={isSubmitting}
            error={errors.unit}
          />
          {/* Quick unit suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-400 self-center mr-1">
              Common:
            </span>
            {COMMON_UNITS.slice(0, 6).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => handleChange("unit", u)}
                disabled={isSubmitting}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stock & Cost Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Current Stock (CREATE ONLY) */}
        {!isEdit ? (
          <div>
            <label
              htmlFor="material-current-stock"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Initial Stock Quantity
            </label>
            <Input
              id="material-current-stock"
              type="number"
              step="0.001"
              min="0"
              placeholder="0"
              value={formData.current_stock}
              onChange={(e) => handleChange("current_stock", e.target.value)}
              disabled={isSubmitting}
              error={errors.current_stock}
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Opening stock on hand
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Current Stock (Read-Only)
            </label>
            <div className="h-9 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center">
              {formData.current_stock} {formData.unit || "units"}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Stock changes must be logged via Transactions.
            </p>
          </div>
        )}

        {/* Minimum Stock Threshold */}
        <div>
          <label
            htmlFor="material-minimum-stock"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Minimum Threshold
          </label>
          <Input
            id="material-minimum-stock"
            type="number"
            step="0.001"
            min="0"
            placeholder="0"
            value={formData.minimum_stock}
            onChange={(e) => handleChange("minimum_stock", e.target.value)}
            disabled={isSubmitting}
            error={errors.minimum_stock}
          />
          <p className="mt-1 text-[10px] text-slate-400">
            Triggers low-stock alert when stock falls at or below this level
          </p>
        </div>
      </div>

      {/* Unit Cost (Optional) */}
      <div>
        <label
          htmlFor="material-unit-cost"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
        >
          Standard Unit Cost (₹) <span className="text-slate-400 text-[10px] normal-case">(Optional)</span>
        </label>
        <Input
          id="material-unit-cost"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 380.00"
          value={formData.unit_cost}
          onChange={(e) => handleChange("unit_cost", e.target.value)}
          disabled={isSubmitting}
          error={errors.unit_cost}
        />
      </div>

      {/* Form Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={isSubmitting}
        >
          {isEdit ? "Update Material" : "Add Material"}
        </Button>
      </div>
    </form>
  );
}

export function MaterialFormModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: MaterialFormModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Material" : "Add New Material"}
      description={
        initialData
          ? "Update material details, measurement unit, and procurement stock threshold."
          : "Register a construction material to monitor stock levels and project usage."
      }
      maxWidth="md"
    >
      <MaterialFormContent
        key={initialData?.id || "create"}
        onClose={onClose}
        initialData={initialData}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
