"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Project, ProjectsResponseData } from "@/types";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatCompactCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { ProjectFormModal } from "@/components/projects/project-form-modal";
import { ProjectListSkeleton } from "@/components/projects/project-list-skeleton";
import { ProjectCard } from "@/components/projects/project-card";

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<ProjectsResponseData>("/projects");
      setProjects(response.projects || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Unable to load projects.");
      } else {
        setError("Unable to load projects. Please verify your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    api
      .get<ProjectsResponseData>("/projects")
      .then((res) => {
        if (isSubscribed) {
          setProjects(res.projects || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          if (err instanceof ApiError) {
            setError(err.message || "Unable to load projects.");
          } else {
            setError("Unable to load projects. Please verify your connection.");
          }
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  // Status breakdown metrics
  const metrics = useMemo(() => {
    const total = projects.length;
    let active = 0;
    let planning = 0;
    let completed = 0;
    let onHold = 0;
    let totalBudget = 0;

    for (const p of projects) {
      if (p.status === "active") active++;
      else if (p.status === "planning") planning++;
      else if (p.status === "completed") completed++;
      else if (p.status === "on_hold") onHold++;

      const b = parseFloat(p.budget);
      if (!isNaN(b)) {
        totalBudget += b;
      }
    }

    return { total, active, planning, completed, onHold, totalBudget };
  }, [projects]);

  // Filtered projects (preserves backend ordering)
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        project.name.toLowerCase().includes(q) ||
        (project.client_name && project.client_name.toLowerCase().includes(q)) ||
        (project.location && project.location.toLowerCase().includes(q));

      return matchesStatus && matchesQuery;
    });
  }, [projects, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Projects
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage construction projects and track their operational status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto"
            >
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Project
            </Button>
          )}
        </div>
      </div>

      {/* ERROR STATE */}
      {error && !isLoading && (
        <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex-shrink-0">
                <svg
                  className="w-5 h-5"
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
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Unable to load projects.
                </h3>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  {error}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProjects}
              className="border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-800 dark:text-red-200 flex-shrink-0"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* LOADING STATE */}
      {isLoading ? (
        <ProjectListSkeleton />
      ) : !error && (
        <>
          {/* METRIC COUNTER CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm buildflow-hover-card">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                Total Projects
              </span>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                {metrics.total}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm buildflow-hover-card-green">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 block">
                Active Sites
              </span>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {metrics.active}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/10 shadow-sm buildflow-hover-card-amber">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400 block">
                In Planning
              </span>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                {metrics.planning}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-50/30 dark:bg-blue-950/10 shadow-sm buildflow-hover-card-blue">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400 block">
                Completed
              </span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
                {metrics.completed}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm col-span-2 sm:col-span-1 buildflow-hover-card">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                Portfolio Budget
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 block truncate">
                {formatCompactCurrency(metrics.totalBudget)}
              </span>
            </div>
          </div>

          {/* SEARCH & FILTER TOOLBAR */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by project name, client, or site location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "active", label: "Active" },
                  { id: "planning", label: "Planning" },
                  { id: "on_hold", label: "On Hold" },
                  { id: "completed", label: "Completed" },
                  { id: "cancelled", label: "Cancelled" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === tab.id
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* EMPTY STATES */}
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-4">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                No projects yet
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                {isAdmin
                  ? "Get started by creating your organization's first construction project."
                  : "No construction projects have been created in your organization yet."}
              </p>
              {isAdmin && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-5"
                >
                  Create Project
                </Button>
              )}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No projects match your search criteria.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="mt-3 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block">
                <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-3.5 px-4">Project</th>
                          <th className="py-3.5 px-4">Client</th>
                          <th className="py-3.5 px-4">Location</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Budget</th>
                          <th className="py-3.5 px-4">Timeline</th>
                          <th className="py-3.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                        {filteredProjects.map((project) => (
                          <tr
                            key={project.id}
                            className="buildflow-hover-row transition-colors group cursor-pointer"
                          >
                            <td className="py-3.5 px-4">
                              <Link
                                href={`/projects/${project.id}`}
                                className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors block text-sm"
                              >
                                {project.name}
                              </Link>
                              {project.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                                  {project.description}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                              {project.client_name || "—"}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                              {project.location || "—"}
                            </td>
                            <td className="py-3.5 px-4">
                              <ProjectStatusBadge status={project.status} size="sm" />
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs">
                                {formatCompactCurrency(project.budget)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {formatCurrency(project.budget)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              <div className="flex flex-col text-[11px]">
                                <span>Start: {formatDate(project.start_date)}</span>
                                <span className="text-slate-400">
                                  Exp: {formatDate(project.expected_end_date)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Link
                                href={`/projects/${project.id}`}
                                className="inline-flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                              >
                                View Details &rarr;
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* MOBILE / TABLET CARDS VIEW */}
              <div className="grid grid-cols-1 gap-3.5 md:hidden">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* CREATE PROJECT MODAL (ADMIN ONLY) */}
      {isAdmin && (
        <ProjectFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleProjectCreated}
        />
      )}
    </div>
  );
}
