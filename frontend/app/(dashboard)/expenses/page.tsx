"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import {
  Project,
  Expense,
  ProjectsResponseData,
  ExpensesResponseData,
} from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatDate,
} from "@/lib/utils";
import {
  ExpenseCategoryBadge,
  EXPENSE_CATEGORIES,
} from "@/components/expenses/expense-category-badge";
import { ExpenseFormModal } from "@/components/expenses/expense-form-modal";

export default function ExpensesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);

  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const refreshExpenses = useCallback(async (projId: number) => {
    try {
      const data = await api.get<ExpensesResponseData>(
        `/projects/${projId}/expenses`
      );
      setExpenses(data.expenses || []);
      setTotalExpenses(parseFloat(data.total_expenses || "0"));
    } catch {
      // Ignored for background refresh
    }
  }, []);

  // 1. Fetch Projects on mount
  useEffect(() => {
    if (!isAdmin) return;

    let isSubscribed = true;

    api
      .get<ProjectsResponseData>("/projects")
      .then((data) => {
        if (!isSubscribed) return;
        const fetchedProjects = data.projects || [];
        setProjects(fetchedProjects);
        if (fetchedProjects.length > 0) {
          setSelectedProjectId((prev) => {
            if (prev && fetchedProjects.some((p) => p.id === prev)) {
              return prev;
            }
            return fetchedProjects[0].id;
          });
        }
        setIsLoadingProjects(false);
      })
      .catch((err) => {
        if (!isSubscribed) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : "Failed to load projects. Please verify backend availability.";
        setError(msg);
        setIsLoadingProjects(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [isAdmin]);

  // 2. Fetch Expenses when selectedProjectId changes
  useEffect(() => {
    if (!isAdmin || !selectedProjectId) return;

    let isSubscribed = true;

    api
      .get<ExpensesResponseData>(`/projects/${selectedProjectId}/expenses`)
      .then((data) => {
        if (!isSubscribed) return;
        setExpenses(data.expenses || []);
        setTotalExpenses(parseFloat(data.total_expenses || "0"));
        setIsLoadingExpenses(false);
      })
      .catch((err) => {
        if (!isSubscribed) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : "Failed to load project expenses.";
        setError(msg);
        setExpenses([]);
        setTotalExpenses(0);
        setIsLoadingExpenses(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [isAdmin, selectedProjectId]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Financial Calculations for Selected Project
  const projectBudget = useMemo(() => {
    if (!selectedProject) return 0;
    return parseFloat(selectedProject.budget || "0");
  }, [selectedProject]);

  const remainingBudget = useMemo(() => {
    return projectBudget - totalExpenses;
  }, [projectBudget, totalExpenses]);

  const budgetUtilization = useMemo(() => {
    if (projectBudget <= 0) return 0;
    return Math.round((totalExpenses / projectBudget) * 100 * 10) / 10;
  }, [projectBudget, totalExpenses]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const descMatch =
        !searchQuery.trim() ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const catMatch =
        categoryFilter === "All" ||
        item.category.toLowerCase() === categoryFilter.toLowerCase();

      return descMatch && catMatch;
    });
  }, [expenses, searchQuery, categoryFilter]);

  if (authLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800/60 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // WORKER RESTRICTED ACCESS VIEW
  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-3.5 max-w-2xl mx-auto mt-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto text-2xl font-bold">
            🛡️
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Financial Ledgers Restricted
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Project cost control, expenditure accounting, and budget burn tracking are restricted to organization administrators.
          </p>
          <div className="pt-2">
            <Badge variant="warning" dot>
              Worker Field Role
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 max-w-md ${
            toastMessage.type === "success"
              ? "bg-white dark:bg-slate-900 border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
              : "bg-white dark:bg-slate-900 border-red-500/50 text-red-700 dark:text-red-300"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              toastMessage.type === "success" ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Project Expenses & Cost Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track site disbursements, equipment rentals, contractor disbursements, and budget burn rate.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingExpense(null);
              setIsFormModalOpen(true);
            }}
            disabled={isLoadingProjects || projects.length === 0}
            className="shadow-md shadow-amber-500/20"
          >
            <span className="text-lg leading-none mr-1.5">+</span> Record Expense
          </Button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-red-500 shrink-0"
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
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedProjectId) refreshExpenses(selectedProjectId);
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Project Selector Bar */}
      <Card hoverEffect="default" className="border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-sm">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 block">
              Active Project Ledger
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {selectedProject ? selectedProject.name : "Select a Construction Project"}
              {selectedProject && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {selectedProject.status.toUpperCase()}
                </Badge>
              )}
            </h3>
          </div>

          <div className="w-full sm:w-72 shrink-0 flex items-center">
            <label htmlFor="select-project-dropdown" className="sr-only">
              Choose Project
            </label>
            <select
              id="select-project-dropdown"
              value={selectedProjectId || 0}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
              disabled={isLoadingProjects || projects.length === 0}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors cursor-pointer"
            >
              {projects.length === 0 ? (
                <option value="0">
                  {isLoadingProjects ? "Loading projects..." : "No projects found"}
                </option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.status.toUpperCase()})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </Card>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Budget */}
        <Card hoverEffect="default" className="bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 h-full p-5 sm:p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Budget
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center text-base font-bold shrink-0">
              💼
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {isLoadingExpenses ? "—" : formatCurrency(projectBudget)}
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
            Allocated project capital
          </span>
        </Card>

        {/* KPI 2: Total Expenses */}
        <Card hoverEffect="default" className="bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 h-full p-5 sm:p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Incurred Expenses
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center text-base font-bold shrink-0">
              💳
            </div>
          </div>
          <div className="my-2">
            <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 truncate">
              {isLoadingExpenses ? "—" : formatCurrency(totalExpenses)}
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
            {expenses.length} transaction{expenses.length === 1 ? "" : "s"} logged
          </span>
        </Card>

        {/* KPI 3: Remaining Budget */}
        <Card hoverEffect="default" className="bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 h-full p-5 sm:p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Remaining Balance
            </span>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold border shrink-0 ${
                remainingBudget < 0
                  ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              }`}
            >
              {remainingBudget < 0 ? "⚠️" : "💰"}
            </div>
          </div>
          <div className="my-2">
            <p
              className={`text-2xl font-bold tracking-tight truncate ${
                remainingBudget < 0
                  ? "text-red-600 dark:text-red-400"
                  : remainingBudget < projectBudget * 0.15
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {isLoadingExpenses ? "—" : formatCurrency(remainingBudget)}
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
            {remainingBudget < 0 ? "Budget overspent" : "Available funds"}
          </span>
        </Card>

        {/* KPI 4: Budget Utilization */}
        <Card hoverEffect="default" className="bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 h-full p-5 sm:p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Burn Rate
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded border ${
                budgetUtilization > 100
                  ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20"
                  : budgetUtilization > 85
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              }`}
            >
              {budgetUtilization}%
            </span>
          </div>

          <div className="my-2">
            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetUtilization > 100
                    ? "bg-red-500"
                    : budgetUtilization > 85
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
              />
            </div>
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
            Target: Under 100% at project completion
          </span>
        </Card>
      </div>

      {/* Search & Category Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <Input
            id="search-expenses"
            type="text"
            placeholder="Search description, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setCategoryFilter("All")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              categoryFilter === "All"
                ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            All ({expenses.length})
          </button>
          {EXPENSE_CATEGORIES.map((cat) => {
            const count = expenses.filter(
              (e) => e.category.toLowerCase() === cat.toLowerCase()
            ).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat} {count > 0 ? `(${count})` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expenses Table / Card List */}
      <Card hoverEffect="default" className="border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm">
        <CardHeader className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              Disbursement Ledger
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {filteredExpenses.length} of {expenses.length} transaction
              {expenses.length === 1 ? "" : "s"} for{" "}
              {selectedProject?.name || "selected project"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingExpenses ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800/40 animate-pulse"
                />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto text-xl font-bold">
                🧾
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {expenses.length === 0
                  ? "No expenses recorded for this project yet"
                  : "No expenses match your search filter"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {expenses.length === 0
                  ? "Click '+ Record Expense' above to log site materials, labor invoices, or equipment costs."
                  : "Try clearing your search query or switching category filters."}
              </p>
              {expenses.length === 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingExpense(null);
                    setIsFormModalOpen(true);
                  }}
                  className="mt-2"
                >
                  + Record First Expense
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {filteredExpenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(expense.expense_date)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <ExpenseCategoryBadge category={expense.category} />
                      </td>
                      <td className="py-3.5 px-4 max-w-xs font-medium text-slate-900 dark:text-slate-200 truncate">
                        {expense.description || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingExpense(expense);
                            setIsFormModalOpen(true);
                          }}
                          className="text-xs text-amber-600 dark:text-amber-500 hover:text-amber-500 hover:bg-amber-500/10 px-2.5 py-1 h-auto"
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Form Modal (Create / Edit) */}
      <ExpenseFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingExpense(null);
        }}
        onSuccess={() => {
          showToast(
            "success",
            editingExpense
              ? "Expense updated successfully."
              : "New expense recorded successfully."
          );
          if (selectedProjectId) {
            refreshExpenses(selectedProjectId);
          }
        }}
        initialData={editingExpense}
        projectId={selectedProjectId || undefined}
        projects={projects}
      />
    </div>
  );
}
