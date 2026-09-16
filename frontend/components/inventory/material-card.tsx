"use client";

import React from "react";
import { Material } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface MaterialCardProps {
  material: Material;
  isAdmin: boolean;
  onEdit?: (material: Material) => void;
  onTransact?: (material: Material) => void;
  onViewHistory: (material: Material) => void;
}

export function MaterialCard({
  material,
  isAdmin,
  onEdit,
  onTransact,
  onViewHistory,
}: MaterialCardProps) {
  const isLowStock = material.low_stock;
  const currentStockNum = parseFloat(material.current_stock) || 0;
  const minStockNum = parseFloat(material.minimum_stock) || 0;

  return (
    <Card
      hoverEffect="default"
      className="p-5 flex flex-col justify-between transition-all duration-200"
    >
      <div className="space-y-4">
        {/* Header: Name & Status Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
              {material.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="capitalize">{material.unit}</span>
              {material.unit_cost && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatCurrency(material.unit_cost)} / {material.unit}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {isLowStock ? (
              <Badge variant="danger" dot className="animate-pulse">
                LOW STOCK
              </Badge>
            ) : (
              <Badge variant="success" dot>
                IN STOCK
              </Badge>
            )}
          </div>
        </div>

        {/* Stock Metrics Section */}
        <div className="grid grid-cols-2 gap-3 py-3 px-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Current Stock
            </span>
            <div
              className={`mt-0.5 text-lg sm:text-xl font-bold ${
                isLowStock
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {currentStockNum.toLocaleString("en-IN", {
                maximumFractionDigits: 3,
              })}{" "}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                {material.unit}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Minimum Threshold
            </span>
            <div className="mt-0.5 text-lg sm:text-xl font-bold text-slate-600 dark:text-slate-300">
              {minStockNum.toLocaleString("en-IN", {
                maximumFractionDigits: 3,
              })}{" "}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                {material.unit}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onViewHistory(material)}
          className="text-xs font-medium cursor-pointer"
        >
          <svg
            className="w-3.5 h-3.5 mr-1 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          History
        </Button>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEdit(material)}
                className="text-xs font-medium cursor-pointer"
              >
                Edit
              </Button>
            )}
            {onTransact && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => onTransact(material)}
                className="text-xs font-semibold cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                Transact
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
