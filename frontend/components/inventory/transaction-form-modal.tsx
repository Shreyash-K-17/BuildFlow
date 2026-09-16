"use client";

import React, { useState } from "react";
import {
  Material,
  Project,
  TransactionType,
  CreateInventoryTransactionPayload,
  InventoryTransactionResponseData,
  InventoryTransaction,
} from "@/types";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  projects?: Project[];
  onSuccess: (newStock: string, transaction: InventoryTransaction) => void;
}

const TRANSACTION_TYPES: { value: TransactionType; label: string; kind: "increase" | "decrease" }[] = [
  { value: "purchase", label: "Purchase (Incoming Stock)", kind: "increase" },
  { value: "consumption", label: "Consumption (Site Usage)", kind: "decrease" },
  { value: "return", label: "Return (Unused from Site)", kind: "increase" },
  { value: "adjustment_in", label: "Adjustment In (Count Surplus)", kind: "increase" },
  { value: "adjustment_out", label: "Adjustment Out (Spoilage / Loss)", kind: "decrease" },
];

function TransactionFormContent({
  onClose,
  material,
  projects,
  onSuccess,
}: {
  onClose: () => void;
  material: Material;
  projects: Project[];
  onSuccess: (newStock: string, transaction: InventoryTransaction) => void;
}) {
  const [transactionType, setTransactionType] = useState<TransactionType>("purchase");
  const [quantity, setQuantity] = useState<string>("");
  const [unitCost, setUnitCost] = useState<string>(
    material.unit_cost !== null && material.unit_cost !== undefined
      ? String(material.unit_cost)
      : ""
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStock = parseFloat(material.current_stock) || 0;
  const enteredQty = parseFloat(quantity) || 0;

  const isIncrease = ["purchase", "return", "adjustment_in"].includes(transactionType);
  const resultingStock = isIncrease
    ? currentStock + enteredQty
    : Math.max(0, currentStock - enteredQty);

  const isInsufficient = !isIncrease && enteredQty > currentStock;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!quantity.trim()) {
      newErrors.quantity = "Quantity is required.";
    } else {
      const qtyNum = parseFloat(quantity);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        newErrors.quantity = "Quantity must be greater than 0.";
      }
    }

    if (unitCost.trim() !== "") {
      const costNum = parseFloat(unitCost);
      if (isNaN(costNum) || costNum < 0) {
        newErrors.unit_cost = "Unit cost must be 0 or greater.";
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
      const payload: CreateInventoryTransactionPayload = {
        material_id: material.id,
        project_id: selectedProjectId ? parseInt(selectedProjectId, 10) : null,
        transaction_type: transactionType,
        quantity: parseFloat(quantity),
        unit_cost: unitCost.trim() !== "" ? parseFloat(unitCost) : null,
        notes: notes.trim() || null,
      };

      const resp = await api.post<InventoryTransactionResponseData>(
        "/inventory/transactions",
        payload
      );

      onSuccess(resp.current_stock, resp.transaction);
      onClose();
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
        setGeneralError(err.message || "Failed to record inventory transaction.");
      } else {
        setGeneralError("An unexpected error occurred while logging the transaction.");
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

      {/* Selected Material Header Card */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Target Material
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {material.name}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Current Available
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {currentStock} {material.unit}
          </span>
        </div>
      </div>

      {/* Transaction Type */}
      <div>
        <label
          htmlFor="transaction-type"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
        >
          Transaction Type <span className="text-red-500">*</span>
        </label>
        <select
          id="transaction-type"
          value={transactionType}
          onChange={(e) => {
            setTransactionType(e.target.value as TransactionType);
            setGeneralError(null);
          }}
          disabled={isSubmitting}
          className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-medium cursor-pointer"
        >
          {TRANSACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {isIncrease
            ? "📈 Stock will increase by this quantity."
            : "📉 Stock will decrease by this quantity."}
        </p>
      </div>

      {/* Quantity & Unit Cost Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="transaction-quantity"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Quantity ({material.unit}) <span className="text-red-500">*</span>
          </label>
          <Input
            id="transaction-quantity"
            type="number"
            step="0.001"
            min="0.001"
            placeholder="e.g. 50"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              if (errors.quantity) {
                setErrors((prev) => ({ ...prev, quantity: "" }));
              }
            }}
            disabled={isSubmitting}
            error={errors.quantity}
          />
        </div>

        <div>
          <label
            htmlFor="transaction-unit-cost"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Unit Cost (₹) <span className="text-slate-400 text-[10px] normal-case">(Optional)</span>
          </label>
          <Input
            id="transaction-unit-cost"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 380.00"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            disabled={isSubmitting}
            error={errors.unit_cost}
          />
        </div>
      </div>

      {/* Associated Project (Optional) */}
      <div>
        <label
          htmlFor="transaction-project"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
        >
          Assigned Project <span className="text-slate-400 text-[10px] normal-case">(Optional)</span>
        </label>
        <select
          id="transaction-project"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          disabled={isSubmitting}
          className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-medium cursor-pointer"
        >
          <option value="">-- General Inventory (No Project) --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.status.replace("_", " ")})
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="transaction-notes"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
        >
          Transaction Notes <span className="text-slate-400 text-[10px] normal-case">(Optional)</span>
        </label>
        <textarea
          id="transaction-notes"
          rows={2}
          placeholder="e.g. Supplier invoice #8921, site foundation pouring batch..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none font-normal"
        />
      </div>

      {/* Live Stock Calculation Preview */}
      {enteredQty > 0 && (
        <div
          className={`p-3 rounded-xl border text-xs space-y-1.5 ${
            isInsufficient
              ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
              : "border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400"
          }`}
        >
          <div className="flex items-center justify-between font-semibold">
            <span>Preview Resulting Stock:</span>
            <span className={isInsufficient ? "text-red-600 dark:text-red-400 font-bold" : "text-slate-900 dark:text-slate-100 font-bold"}>
              {currentStock} {isIncrease ? "+" : "-"} {enteredQty} = {resultingStock} {material.unit}
            </span>
          </div>
          {isInsufficient && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              ⚠️ Warning: Requested quantity exceeds current available stock ({currentStock} {material.unit}). The transaction will be rejected by the server.
            </p>
          )}
        </div>
      )}

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
          Record Transaction
        </Button>
      </div>
    </form>
  );
}

export function TransactionFormModal({
  isOpen,
  onClose,
  material,
  projects = [],
  onSuccess,
}: TransactionFormModalProps) {
  if (!isOpen || !material) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Stock Transaction"
      description={`Log inventory movements and material allocations for ${material.name}.`}
      maxWidth="md"
    >
      <TransactionFormContent
        key={material.id}
        onClose={onClose}
        material={material}
        projects={projects}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
