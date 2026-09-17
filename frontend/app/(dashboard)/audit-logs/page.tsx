"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { AuditLog, AuditLogsResponseData, PaginationMetadata } from "@/types";

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
import { formatDateTime } from "@/lib/utils";
import {
  AuditActionBadge,
  AuditEntityBadge,
} from "@/components/audit/audit-action-badge";
import { AuditDiffModal } from "@/components/audit/audit-diff-modal";

const ENTITY_OPTIONS = [
  "All",
  "project",
  "task",
  "worker",
  "attendance",
  "material",
  "inventory_transaction",
  "expense",
] as const;

const ACTION_OPTIONS = ["All", "create", "update"] as const;

export default function AuditLogsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState<string>("All");
  const [actionFilter, setActionFilter] = useState<string>("All");

  // Diff Modal State
  const [selectedLogForDiff, setSelectedLogForDiff] = useState<AuditLog | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);

  const fetchAuditLogs = useCallback(
    async (pageToFetch: number = currentPage) => {
      if (!isAdmin) return;
      setIsLoading(true);
      setError(null);

      try {
        const data = await api.get<AuditLogsResponseData>(
          `/audit-logs?page=${pageToFetch}&per_page=25`
        );
        setAuditLogs(data.audit_logs || []);
        if (data.pagination) {
          setPagination(data.pagination);
          setCurrentPage(data.pagination.page);
        }
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Failed to load organizational audit trail.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [isAdmin, currentPage]
  );

  useEffect(() => {
    if (!isAdmin) return;

    let isSubscribed = true;

    api
      .get<AuditLogsResponseData>(`/audit-logs?page=${currentPage}&per_page=25`)
      .then((data) => {
        if (!isSubscribed) return;
        setAuditLogs(data.audit_logs || []);
        if (data.pagination) {
          setPagination(data.pagination);
          setCurrentPage(data.pagination.page);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isSubscribed) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : "Failed to load organizational audit trail.";
        setError(msg);
        setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [isAdmin, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    if (pagination && newPage > pagination.pages && pagination.pages > 0) return;
    setCurrentPage(newPage);
    fetchAuditLogs(newPage);
  };

  // Filtered Audit Logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Entity Filter
      const matchEntity =
        entityFilter === "All" ||
        log.entity_type.toLowerCase() === entityFilter.toLowerCase();

      // Action Filter
      const matchAction =
        actionFilter === "All" ||
        log.action.toLowerCase() === actionFilter.toLowerCase();

      // Text Search across entity, action, user_id, entity_id, and JSON values
      if (!searchQuery.trim()) {
        return matchEntity && matchAction;
      }

      const query = searchQuery.toLowerCase();
      const basicMatch =
        log.action.toLowerCase().includes(query) ||
        log.entity_type.toLowerCase().includes(query) ||
        (log.entity_id && String(log.entity_id).includes(query)) ||
        (log.user_id && String(log.user_id).includes(query));

      const oldValString = log.old_values ? JSON.stringify(log.old_values).toLowerCase() : "";
      const newValString = log.new_values ? JSON.stringify(log.new_values).toLowerCase() : "";
      const valueMatch = oldValString.includes(query) || newValString.includes(query);

      return matchEntity && matchAction && (basicMatch || valueMatch);
    });
  }, [auditLogs, entityFilter, actionFilter, searchQuery]);

  if (authLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-96 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
      </div>
    );
  }

  // WORKER RESTRICTED ACCESS VIEW
  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-3.5 max-w-2xl mx-auto mt-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto text-2xl font-bold">
            🛡️
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            System Audit Logs Restricted
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Cryptographic audit records, entity mutation diffs, and security compliance streams are restricted to administrative personnel.
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable chronological audit record of operational events, entity mutations, and administrative actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAuditLogs(currentPage)}
            disabled={isLoading}
            className="text-xs"
          >
            <span className="mr-1.5">↻</span> Refresh Trail
          </Button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-xs text-red-600 dark:text-red-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0"
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
          <Button variant="outline" size="sm" onClick={() => fetchAuditLogs(currentPage)}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card hoverEffect="default">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md flex items-center">
              <Input
                id="search-audit-logs"
                type="text"
                placeholder="Search action, entity ID, modified values..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Action Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                Action:
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                {ACTION_OPTIONS.map((act) => (
                  <button
                    key={act}
                    type="button"
                    onClick={() => setActionFilter(act)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors uppercase text-[10px] leading-tight cursor-pointer ${
                      actionFilter === act
                        ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Entity Type Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
              Entity:
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {ENTITY_OPTIONS.map((ent) => {
                const count =
                  ent === "All"
                    ? auditLogs.length
                    : auditLogs.filter(
                        (l) => l.entity_type.toLowerCase() === ent.toLowerCase()
                      ).length;

                return (
                  <button
                    key={ent}
                    type="button"
                    onClick={() => setEntityFilter(ent)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      entityFilter === ent
                        ? "bg-amber-500/15 dark:bg-slate-800 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/40"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <span>{ent.replace(/_/g, " ").toUpperCase()}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-950 text-slate-700 dark:text-slate-400 font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Audit Logs Table / Feed */}
      <Card hoverEffect="default" className="overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              Audit Event Stream
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {filteredLogs.length} event{filteredLogs.length === 1 ? "" : "s"} on page{" "}
              {pagination?.page || 1} of {pagination?.pages || 1} (
              {pagination?.total ?? auditLogs.length} total recorded)
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800/40 animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-xl">
                ⚠️
              </div>
              <h4 className="text-sm font-bold text-red-600 dark:text-red-400">
                Unable to load audit logs
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAuditLogs(currentPage)}
                className="mt-2 text-xs"
              >
                Try Again
              </Button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto text-xl font-bold">
                📜
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {auditLogs.length === 0
                  ? "No audit events recorded yet"
                  : "No audit records match your filters"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {auditLogs.length === 0
                  ? "Administrative actions, project updates, and workforce mutations will automatically log here."
                  : "Try resetting your search query or switching entity filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Event ID</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Entity Type</th>
                    <th className="py-3.5 px-4">Entity ID</th>
                    <th className="py-3.5 px-4">Actor</th>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4 text-center">Change Inspector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        #{log.id}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <AuditActionBadge action={log.action} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <AuditEntityBadge entityType={log.entity_type} />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {log.entity_id ? `#${log.entity_id}` : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-300 font-medium">
                        {log.user_id ? `User #${log.user_id}` : "System"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block text-xs">
                          {formatDateTime(log.created_at)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLogForDiff(log);
                            setIsDiffModalOpen(true);
                          }}
                          className="text-xs text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-500/10 px-2.5 py-1 h-auto cursor-pointer"
                        >
                          View Diff
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination Controls */}
        {pagination && pagination.pages > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing page <span className="font-semibold text-slate-900 dark:text-white">{pagination.page}</span> of{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{pagination.pages}</span> (
              <span className="font-semibold text-slate-900 dark:text-white">{pagination.total}</span> total events)
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="text-xs h-8 px-3"
              >
                ← Previous
              </Button>

              <div className="text-xs px-2.5 py-1 font-mono font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {currentPage} / {pagination.pages}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= pagination.pages || isLoading}
                className="text-xs h-8 px-3"
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Audit Diff Inspector Modal */}
      <AuditDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => {
          setIsDiffModalOpen(false);
          setSelectedLogForDiff(null);
        }}
        log={selectedLogForDiff}
      />
    </div>
  );
}
