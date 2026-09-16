"use client";

import React, { useState, useEffect } from "react";
import {
  Material,
  Project,
  InventoryTransaction,
  InventoryTransactionsResponseData,
} from "@/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { TransactionTypeBadge } from "./transaction-type-badge";

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  projects?: Project[];
}

function TransactionHistoryContent({
  onClose,
  material,
  projects,
}: {
  onClose: () => void;
  material: Material;
  projects: Project[];
}) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = () => {
    setIsLoading(true);
    setError(null);

    api
      .get<InventoryTransactionsResponseData>(
        `/materials/${material.id}/transactions`
      )
      .then((data) => {
        setTransactions(data.transactions || []);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load inventory transaction history.");
        }
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let isSubscribed = true;

    api
      .get<InventoryTransactionsResponseData>(
        `/materials/${material.id}/transactions`
      )
      .then((data) => {
        if (!isSubscribed) return;
        setTransactions(data.transactions || []);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isSubscribed) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load inventory transaction history.");
        }
        setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [material.id]);

  const getProjectName = (projectId: number | null): string | null => {
    if (!projectId) return null;
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : `Project #${projectId}`;
  };

  return (
    <div className="space-y-4">
      {/* Material Summary Strip */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs">
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {material.name}
          </span>
          <span className="text-slate-500 dark:text-slate-400 ml-2">
            ({material.unit})
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 dark:text-slate-400">
            Current Stock:{" "}
            <strong className="text-slate-900 dark:text-slate-100">
              {material.current_stock} {material.unit}
            </strong>
          </span>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="space-y-2.5 py-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60"
            />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 text-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 space-y-3">
          <p className="text-xs font-medium">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchTransactions}
            className="text-xs"
          >
            Try Again
          </Button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-base">
            📦
          </div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            No transactions recorded yet.
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            Stock movements, site consumption, and supplier deliveries will appear here.
          </p>
        </div>
      ) : (
        <div className="max-h-[55vh] overflow-y-auto space-y-2.5 pr-1">
          {transactions.map((tx) => {
            const isIncrease = ["purchase", "return", "adjustment_in"].includes(
              tx.transaction_type
            );
            const projectName = getProjectName(tx.project_id);
            const qtyNum = parseFloat(tx.quantity) || 0;

            return (
              <div
                key={tx.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <TransactionTypeBadge type={tx.transaction_type} />
                    {projectName && (
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                        🏗️ {projectName}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-bold ${
                        isIncrease
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {isIncrease ? "+" : "-"}
                      {qtyNum.toLocaleString("en-IN", {
                        maximumFractionDigits: 3,
                      })}{" "}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                        {material.unit}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  <div>
                    {tx.unit_cost && (
                      <span>
                        Rate:{" "}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {formatCurrency(tx.unit_cost)}
                        </strong>{" "}
                        / {material.unit}
                      </span>
                    )}
                  </div>
                  <time dateTime={tx.created_at || ""}>
                    {formatDateTime(tx.created_at)}
                  </time>
                </div>

                {tx.notes && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60 italic">
                    &ldquo;{tx.notes}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  );
}

export function TransactionHistoryModal({
  isOpen,
  onClose,
  material,
  projects = [],
}: TransactionHistoryModalProps) {
  if (!isOpen || !material) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction History"
      description={`Audit log of all stock receipts, allocations, and adjustments for ${material.name}.`}
      maxWidth="lg"
    >
      <TransactionHistoryContent
        key={material.id}
        onClose={onClose}
        material={material}
        projects={projects}
      />
    </Modal>
  );
}
