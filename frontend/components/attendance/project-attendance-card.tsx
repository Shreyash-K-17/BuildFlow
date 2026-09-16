"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Attendance,
  Worker,
  AttendanceListResponseData,
  WorkersResponseData,
} from "@/types";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AttendanceStatusBadge } from "./attendance-status-badge";
import { AttendanceFormModal } from "./attendance-form-modal";

interface ProjectAttendanceCardProps {
  projectId: number;
  workers?: Worker[];
}

export function ProjectAttendanceCard({
  projectId,
  workers: passedWorkers,
}: ProjectAttendanceCardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [workers, setWorkers] = useState<Worker[]>(passedWorkers || []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter state
  const [dateFilter, setDateFilter] = useState<string>("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [attRes, workersRes] = await Promise.all([
        api.get<AttendanceListResponseData>(`/projects/${projectId}/attendance`),
        passedWorkers && passedWorkers.length > 0
          ? Promise.resolve({ workers: passedWorkers })
          : api.get<WorkersResponseData>("/workers").catch(() => ({ workers: [] })),
      ]);

      setAttendanceRecords(attRes.attendance || []);
      setWorkers(workersRes.workers || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load project attendance records.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, passedWorkers]);

  useEffect(() => {
    let isSubscribed = true;

    Promise.all([
      api.get<AttendanceListResponseData>(`/projects/${projectId}/attendance`),
      passedWorkers && passedWorkers.length > 0
        ? Promise.resolve({ workers: passedWorkers })
        : api.get<WorkersResponseData>("/workers").catch(() => ({ workers: [] })),
    ])
      .then(([attRes, workersRes]) => {
        if (!isSubscribed) return;
        setAttendanceRecords(attRes.attendance || []);
        setWorkers(workersRes.workers || []);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isSubscribed) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load project attendance records.");
        }
        setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [projectId, passedWorkers]);

  // Worker lookup map
  const workersMap = useMemo(() => {
    const map: Record<number, Worker> = {};
    for (const w of workers) {
      map[w.id] = w;
    }
    return map;
  }, [workers]);

  // Filter records by date if filter active
  const filteredRecords = useMemo(() => {
    if (!dateFilter) return attendanceRecords;
    return attendanceRecords.filter((r) => r.attendance_date === dateFilter);
  }, [attendanceRecords, dateFilter]);

  // Group records by attendance_date (newest date first)
  const groupedByDate = useMemo(() => {
    const groups: { date: string; records: Attendance[] }[] = [];
    const dateMap = new Map<string, Attendance[]>();

    for (const r of filteredRecords) {
      const current = dateMap.get(r.attendance_date) || [];
      current.push(r);
      dateMap.set(r.attendance_date, current);
    }

    // Sort dates descending
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => (b > a ? 1 : -1));

    for (const d of sortedDates) {
      groups.push({
        date: d,
        records: dateMap.get(d) || [],
      });
    }

    return groups;
  }, [filteredRecords]);

  // Derived metrics
  const totalLogs = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(
    (r) => r.status === "present" || r.status === "half_day"
  ).length;

  const handleCreateAttendance = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEditAttendance = (record: Attendance) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleAttendanceSaved = (saved: Attendance) => {
    setAttendanceRecords((prev) => {
      const exists = prev.some((r) => r.id === saved.id);
      if (exists) {
        return prev.map((r) => (r.id === saved.id ? saved : r));
      } else {
        return [saved, ...prev];
      }
    });

    const actionText = editingRecord ? "updated" : "recorded";
    setSuccessToast(`Attendance record ${actionText} successfully.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <>
      <Card hoverEffect="default" className="overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Workforce & Site Attendance
                </CardTitle>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {totalLogs} {totalLogs === 1 ? "Log" : "Logs"}
                </span>
              </div>
              <CardDescription className="mt-0.5 text-xs">
                {isAdmin
                  ? "Daily site muster, check-in timestamps, and trade presence."
                  : "Your recorded site attendance and verified hours for this project."}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCreateAttendance}
                  className="text-xs font-semibold"
                >
                  + Log Attendance
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Toast Notification */}
          {successToast && (
            <div
              role="status"
              className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center justify-between animate-in fade-in duration-150"
            >
              <span>✓ {successToast}</span>
              <button
                type="button"
                onClick={() => setSuccessToast(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Date Filter & Metrics Bar */}
          {attendanceRecords.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-50/70 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                <div>
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    Total Recorded:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {totalLogs}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    Active Present:
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {presentCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="filter-attendance-date"
                  className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0"
                >
                  Filter Date:
                </label>
                <input
                  id="filter-attendance-date"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter("")}
                    className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="space-y-3 animate-pulse" aria-busy="true">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3"
                />
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="p-6 text-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs space-y-2">
              <p className="font-medium">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="text-xs"
              >
                Try Again
              </Button>
            </div>
          ) : attendanceRecords.length === 0 ? (
            /* Empty State */
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-lg">
                📋
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {isAdmin
                    ? "No attendance logs recorded for this project yet."
                    : "No attendance logs found for your account on this project."}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-0.5">
                  {isAdmin
                    ? "Log daily site presence, check-in and check-out timestamps for trade personnel."
                    : "Attendance records will appear here once verified by site management."}
                </p>
              </div>
              {isAdmin && (
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleCreateAttendance}
                    className="text-xs"
                  >
                    + Record Today&apos;s Attendance
                  </Button>
                </div>
              )}
            </div>
          ) : groupedByDate.length === 0 ? (
            /* Empty search result */
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No attendance entries matching date: <strong>{dateFilter}</strong>.
            </div>
          ) : (
            /* Date Grouped Attendance List */
            <div className="space-y-4">
              {groupedByDate.map((group) => (
                <div key={group.date} className="space-y-2">
                  {/* Date Header Badge */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{formatDate(group.date)}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({group.records.length} {group.records.length === 1 ? "person" : "people"})
                    </span>
                  </div>

                  {/* Records list */}
                  <div className="space-y-2">
                    {group.records.map((record) => {
                      const worker = workersMap[record.worker_id];

                      return (
                        <div
                          key={record.id}
                          className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 buildflow-hover-card"
                        >
                          {/* Worker Info & Timestamps */}
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                {worker ? worker.name : `Worker #${record.worker_id}`}
                              </span>
                              {worker?.worker_type && (
                                <span className="px-2 py-0.2 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  {worker.worker_type}
                                </span>
                              )}
                              <AttendanceStatusBadge status={record.status} />
                            </div>

                            {/* Check-in / Check-out timestamps */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <div>
                                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mr-1">
                                  Check In:
                                </span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                  {formatTime(record.check_in)}
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mr-1">
                                  Check Out:
                                </span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                  {formatTime(record.check_out)}
                                </span>
                              </div>
                            </div>

                            {/* Notes */}
                            {record.notes && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 italic pt-0.5">
                                &ldquo;{record.notes}&rdquo;
                              </p>
                            )}
                          </div>

                          {/* Admin Edit Action */}
                          {isAdmin && (
                            <div className="flex items-center justify-end shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditAttendance(record)}
                                className="h-7 px-2.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80"
                                aria-label={`Edit attendance for ${worker ? worker.name : "worker"}`}
                              >
                                Edit
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Form Modal (Admin Only) */}
      {isAdmin && (
        <AttendanceFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRecord(null);
          }}
          projectId={projectId}
          initialData={editingRecord}
          workers={workers}
          onSuccess={handleAttendanceSaved}
        />
      )}
    </>
  );
}
