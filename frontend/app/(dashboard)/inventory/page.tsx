"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Material,
  MaterialsResponseData,
  Project,
  ProjectsResponseData,
  InventoryTransaction,
} from "@/types";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MaterialCard } from "@/components/inventory/material-card";
import { MaterialFormModal } from "@/components/inventory/material-form-modal";
import { TransactionFormModal } from "@/components/inventory/transaction-form-modal";
import { TransactionHistoryModal } from "@/components/inventory/transaction-history-modal";

export default function InventoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_stock" | "low_stock">("all");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const [isTransactModalOpen, setIsTransactModalOpen] = useState(false);
  const [transactingMaterial, setTransactingMaterial] = useState<Material | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(null);

  // Toast feedback
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchMaterials = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<MaterialsResponseData>("/materials");
      setMaterials(data.materials || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load materials inventory.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);



  useEffect(() => {
    let isSubscribed = true;

    api
      .get<MaterialsResponseData>("/materials")
      .then((data) => {
        if (!isSubscribed) return;
        setMaterials(data.materials || []);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isSubscribed) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load materials inventory.");
        }
        setIsLoading(false);
      });

    api
      .get<ProjectsResponseData>("/projects")
      .then((data) => {
        if (!isSubscribed) return;
        setProjects(data.projects || []);
      })
      .catch(() => {
        // Projects optional for inventory view; ignore silent failure
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Toast timer
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalMaterials = materials.length;
    const lowStockCount = materials.filter((m) => m.low_stock).length;
    const inStockCount = totalMaterials - lowStockCount;

    const totalInventoryValue = materials.reduce((acc, m) => {
      if (m.unit_cost !== null && m.unit_cost !== undefined) {
        const stock = parseFloat(m.current_stock) || 0;
        const cost = parseFloat(m.unit_cost) || 0;
        return acc + stock * cost;
      }
      return acc;
    }, 0);

    return {
      totalMaterials,
      lowStockCount,
      inStockCount,
      totalInventoryValue,
    };
  }, [materials]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        material.name.toLowerCase().includes(query) ||
        material.unit.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "low_stock"
          ? material.low_stock
          : !material.low_stock;

      return matchesSearch && matchesStatus;
    });
  }, [materials, searchQuery, statusFilter]);

  // Action Handlers
  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (material: Material) => {
    setEditingMaterial(material);
    setIsFormModalOpen(true);
  };

  const handleOpenTransact = (material: Material) => {
    setTransactingMaterial(material);
    setIsTransactModalOpen(true);
  };

  const handleOpenHistory = (material: Material) => {
    setHistoryMaterial(material);
    setIsHistoryModalOpen(true);
  };

  const handleFormSuccess = (savedMaterial: Material) => {
    setSuccessToast(
      editingMaterial
        ? `Material "${savedMaterial.name}" updated successfully.`
        : `Material "${savedMaterial.name}" created successfully.`
    );
    fetchMaterials();
  };

  const handleTransactSuccess = (
    _newStock: string,
    transaction: InventoryTransaction
  ) => {
    setSuccessToast(
      `Transaction recorded: ${transaction.transaction_type.toUpperCase()} (${transaction.quantity} units).`
    );
    fetchMaterials();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-xl bg-white dark:bg-slate-900 border border-emerald-500/40 text-slate-900 dark:text-slate-100 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 shrink-0">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-xs font-medium pr-2">{successToast}</p>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-slate-400 hover:text-slate-200 text-sm ml-auto cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Materials & Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track materials, stock levels, and inventory movements across projects.
          </p>
        </div>

        {isAdmin && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            className="cursor-pointer shrink-0 shadow-sm"
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Material
          </Button>
        )}
      </div>

      {/* Inventory KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Materials */}
        <Card hoverEffect="default" className="p-4 sm:p-5 flex flex-col justify-center space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total Materials
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            {kpis.totalMaterials}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Catalogued items
          </span>
        </Card>

        {/* Low Stock Items */}
        <Card hoverEffect="default" className="p-4 sm:p-5 flex flex-col justify-center space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Low Stock Alerts
          </span>
          <div
            className={`text-xl sm:text-2xl font-bold ${
              kpis.lowStockCount > 0
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {kpis.lowStockCount}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            {kpis.lowStockCount > 0
              ? "Replenishment required"
              : "All stock levels healthy"}
          </span>
        </Card>

        {/* In-Stock Items */}
        <Card hoverEffect="default" className="p-4 sm:p-5 flex flex-col justify-center space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Healthy Stock
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {kpis.inStockCount}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Above minimum threshold
          </span>
        </Card>

        {/* Estimated Inventory Value */}
        <Card hoverEffect="default" className="p-4 sm:p-5 flex flex-col justify-center space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Inventory Value
          </span>
          <div className="text-xl sm:text-2xl font-bold text-amber-500 truncate">
            {formatCurrency(kpis.totalInventoryValue)}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Estimated asset valuation
          </span>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <Card hoverEffect="default">
        <div className="p-4 sm:p-5 flex flex-col sm:grid sm:grid-cols-3 sm:items-center gap-3">
          {/* Search Input */}
          <div className="sm:col-span-2">
            <input
              id="search-materials"
              type="text"
              placeholder="Search material by name or measurement unit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-normal"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="filter-stock-status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "in_stock" | "low_stock")
              }
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 cursor-pointer font-medium"
              aria-label="Filter by stock status"
            >
              <option value="all">All Materials ({materials.length})</option>
              <option value="in_stock">In Stock ({kpis.inStockCount})</option>
              <option value="low_stock">Low Stock ({kpis.lowStockCount})</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            />
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="p-8 text-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 space-y-3">
          <p className="text-sm font-medium">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchMaterials}
            className="text-xs"
          >
            Try Again
          </Button>
        </div>
      ) : filteredMaterials.length === 0 ? (
        /* Empty State */
        <div className="p-10 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl">
            📦
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {materials.length === 0
                ? "No materials in inventory yet."
                : "No materials match your filter criteria."}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {materials.length === 0
                ? isAdmin
                  ? "Click '+ Add Material' above to register raw materials and track stock movements."
                  : "Materials registered by your organization will appear here."
                : "Try clearing your search query or adjusting the stock status filter."}
            </p>
          </div>
          {materials.length === 0 && isAdmin && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="mt-2 text-xs"
            >
              + Add First Material
            </Button>
          )}
        </div>
      ) : (
        /* Material Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              isAdmin={isAdmin}
              onEdit={handleOpenEdit}
              onTransact={handleOpenTransact}
              onViewHistory={handleOpenHistory}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Material Modal */}
      {isFormModalOpen && (
        <MaterialFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingMaterial(null);
          }}
          initialData={editingMaterial}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Record Transaction Modal */}
      {isTransactModalOpen && transactingMaterial && (
        <TransactionFormModal
          isOpen={isTransactModalOpen}
          onClose={() => {
            setIsTransactModalOpen(false);
            setTransactingMaterial(null);
          }}
          material={transactingMaterial}
          projects={projects}
          onSuccess={handleTransactSuccess}
        />
      )}

      {/* Transaction History Modal */}
      {isHistoryModalOpen && historyMaterial && (
        <TransactionHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setHistoryMaterial(null);
          }}
          material={historyMaterial}
          projects={projects}
        />
      )}
    </div>
  );
}
