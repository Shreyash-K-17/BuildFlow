"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Worker, WorkersResponseData } from "@/types";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkerFormModal } from "@/components/workers/worker-form-modal";
import { WorkerCard } from "@/components/workers/worker-card";

export default function WorkersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [tradeFilter, setTradeFilter] = useState<string>("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchWorkers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<WorkersResponseData>("/workers");
      setWorkers(data.workers || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load workforce directory.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    api
      .get<WorkersResponseData>("/workers")
      .then((data) => {
        if (!isSubscribed) return;
        setWorkers(data.workers || []);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isSubscribed) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load workforce directory.");
        }
        setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Derived summaries
  const totalWorkers = workers.length;
  const activeWorkers = workers.filter((w) => w.is_active).length;
  const inactiveWorkers = workers.filter((w) => !w.is_active).length;

  const uniqueTrades = useMemo(() => {
    const trades = new Set<string>();
    for (const w of workers) {
      if (w.worker_type) {
        trades.add(w.worker_type);
      }
    }
    return Array.from(trades).sort();
  }, [workers]);

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      // Status filter
      if (statusFilter === "active" && !worker.is_active) return false;
      if (statusFilter === "inactive" && worker.is_active) return false;

      // Trade filter
      if (tradeFilter !== "all" && worker.worker_type !== tradeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = worker.name.toLowerCase().includes(query);
        const matchEmail = worker.email.toLowerCase().includes(query);
        const matchPhone = worker.phone ? worker.phone.toLowerCase().includes(query) : false;
        const matchType = worker.worker_type ? worker.worker_type.toLowerCase().includes(query) : false;

        if (!matchName && !matchEmail && !matchPhone && !matchType) {
          return false;
        }
      }

      return true;
    });
  }, [workers, statusFilter, tradeFilter, searchQuery]);

  const handleCreateWorker = () => {
    setEditingWorker(null);
    setIsModalOpen(true);
  };

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setIsModalOpen(true);
  };

  const handleWorkerSaved = (savedWorker: Worker) => {
    setWorkers((prev) => {
      const exists = prev.some((w) => w.id === savedWorker.id);
      if (exists) {
        return prev.map((w) => (w.id === savedWorker.id ? savedWorker : w));
      } else {
        return [...prev, savedWorker];
      }
    });

    const actionText = editingWorker ? "updated" : "registered";
    setSuccessToast(`Worker ${savedWorker.name} ${actionText} successfully.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl font-bold">
            🛡️
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Workforce Management Restricted
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            The organizational workforce directory and worker account management is restricted to administrative personnel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div
          role="status"
          className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center justify-between animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Dismiss toast"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Workforce
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage site trades, worker profiles, credentials, and compensation rates.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleCreateWorker}
          className="shrink-0"
        >
          + Add Worker
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverEffect="default" className="p-4 sm:p-5 flex flex-col justify-center space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total Workforce
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalWorkers}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Registered site personnel
          </span>
        </Card>

        <Card hoverEffect="default" className="p-4 sm:p-5 flex flex-col justify-center space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Active Workers
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {activeWorkers}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Eligible for site assignment
          </span>
        </Card>

        <Card hoverEffect="default" className="p-4 sm:p-5 flex flex-col justify-center space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Inactive
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-600 dark:text-slate-400">
            {inactiveWorkers}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Deactivated logins
          </span>
        </Card>

        <Card hoverEffect="default" className="p-4 sm:p-5 flex flex-col justify-center space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Specialties & Trades
          </span>
          <div className="text-xl sm:text-2xl font-bold text-amber-500">
            {uniqueTrades.length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Active trade categories
          </span>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <Card hoverEffect="default">
        <div className="p-4 sm:p-5 flex flex-col sm:grid sm:grid-cols-3 sm:items-center gap-3">
          {/* Search Input */}
          <div className="sm:col-span-1">
            <input
              id="search-workers"
              type="text"
              placeholder="Search name, trade, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>

          {/* Trade Filter */}
          <div>
            <select
              id="filter-trade"
              value={tradeFilter}
              onChange={(e) => setTradeFilter(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 cursor-pointer"
              aria-label="Filter by trade"
            >
              <option value="all">All Trades ({uniqueTrades.length})</option>
              {uniqueTrades.map((trade) => (
                <option key={trade} value={trade}>
                  {trade}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 cursor-pointer"
              aria-label="Filter by active status"
            >
              <option value="all">All Statuses ({workers.length})</option>
              <option value="active">Active ({activeWorkers})</option>
              <option value="inactive">Inactive ({inactiveWorkers})</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse" aria-busy="true">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
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
            onClick={fetchWorkers}
            className="text-xs"
          >
            Try Again
          </Button>
        </div>
      ) : filteredWorkers.length === 0 ? (
        /* Empty State */
        <div className="p-10 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl">
            👷
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {searchQuery || statusFilter !== "all" || tradeFilter !== "all"
                ? "No matching workers found."
                : "No workforce members registered yet."}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {searchQuery || statusFilter !== "all" || tradeFilter !== "all"
                ? "Try adjusting your search criteria or clearing active filters."
                : "Add masons, carpenters, electricians, and site supervisors to assign tasks and log attendance."}
            </p>
          </div>
          {workers.length === 0 && (
            <div className="pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleCreateWorker}
                size="sm"
              >
                + Register First Worker
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Worker List: Table on Desktop, Cards on Mobile */
        <div className="space-y-4">
          {/* Mobile View: Cards */}
          <div className="block md:hidden space-y-3">
            {filteredWorkers.map((worker) => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                isAdmin={isAdmin}
                onEdit={handleEditWorker}
              />
            ))}
          </div>

          {/* Desktop View: Table/Card Hybrid */}
          <div className="hidden md:block">
            <Card hoverEffect="default" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 text-slate-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Worker</th>
                      <th className="py-3 px-4">Trade</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Daily Wage</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Linked User</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredWorkers.map((worker) => (
                      <tr
                        key={worker.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Name */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                            {worker.name}
                          </span>
                        </td>

                        {/* Trade */}
                        <td className="py-3 px-4">
                          {worker.worker_type ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              {worker.worker_type}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">General</span>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          <span className="block truncate max-w-[180px]">
                            {worker.email}
                          </span>
                          {worker.phone && (
                            <span className="text-[11px] text-slate-400 block">
                              {worker.phone}
                            </span>
                          )}
                        </td>

                        {/* Daily Wage */}
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                          {worker.daily_wage ? (
                            <span>
                              {formatCurrency(worker.daily_wage)}
                              <span className="text-[10px] text-slate-400 font-normal"> /day</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {worker.is_active ? (
                            <Badge variant="success" dot>
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" dot>
                              Inactive
                            </Badge>
                          )}
                        </td>

                        {/* Linked Account */}
                        <td className="py-3 px-4 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>User #{worker.user_id}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditWorker(worker)}
                            className="h-7 px-2.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80"
                            aria-label={`Edit ${worker.name}`}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Worker Form Modal */}
      <WorkerFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingWorker(null);
        }}
        initialData={editingWorker}
        onSuccess={handleWorkerSaved}
      />
    </div>
  );
}
