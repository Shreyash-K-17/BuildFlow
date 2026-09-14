"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Project, ProjectResponseData } from "@/types";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCurrency, formatCompactCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { ProjectFormModal } from "@/components/projects/project-form-modal";

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectIdStr = params?.projectId as string;
  const projectId = projectIdStr ? parseInt(projectIdStr, 10) : NaN;
  const isInvalidId = isNaN(projectId);

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(!isInvalidId);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchProjectDetails = useCallback(async () => {
    if (isNaN(projectId)) {
      setError("The project doesn't exist or you don't have permission to view it.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<ProjectResponseData>(
        `/projects/${projectId}`
      );
      setProject(response.project);
    } catch {
      setError("The project doesn't exist or you don't have permission to view it.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isNaN(projectId)) return;

    let isSubscribed = true;
    api
      .get<ProjectResponseData>(`/projects/${projectId}`)
      .then((res) => {
        if (isSubscribed) {
          setProject(res.project);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setError("The project doesn't exist or you don't have permission to view it.");
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [projectId]);

  const handleProjectUpdated = (updatedProject: Project) => {
    setProject(updatedProject);
    setSuccessToast("Project details updated successfully.");
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const displayError = isInvalidId
    ? "The project doesn't exist or you don't have permission to view it."
    : error;

  // Skeleton Loader for Project Details
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading project details">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="flex flex-col sm:flex-row justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-24"
            />
          ))}
        </div>
        <div className="h-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" />
      </div>
    );
  }

  // Project Not Found / Error State
  if (displayError || !project) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div>
          <Link
            href="/projects"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Projects
          </Link>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center text-center p-12">
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
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Project Not Found
            </h2>
            <p className="mt-1.5 max-w-md text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              The project doesn&apos;t exist or you don&apos;t have permission to view it.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/projects")}
              >
                &larr; Back to Projects
              </Button>
              {!isInvalidId && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={fetchProjectDetails}
                >
                  Retry
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* SUCCESS BANNER */}
      {successToast && (
        <div
          role="status"
          className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:opacity-75"
          >
            &times;
          </button>
        </div>
      )}

      {/* BREADCRUMB / BACK LINK */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Projects
        </Link>
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {project.name}
            </h1>
            <ProjectStatusBadge status={project.status} size="md" />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {project.client_name && (
              <span>
                Client: <strong className="font-semibold text-slate-700 dark:text-slate-300">{project.client_name}</strong>
              </span>
            )}
            {project.location && (
              <span>
                Location: <strong className="font-semibold text-slate-700 dark:text-slate-300">{project.location}</strong>
              </span>
            )}
          </div>
        </div>

        {isAdmin && (
          <Button
            variant="outline"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Project
          </Button>
        )}
      </div>

      {/* KPI / METRIC HIGHLIGHTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm buildflow-hover-card buildflow-hover-card-amber">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Allocated Budget
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">
            {formatCompactCurrency(project.budget)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block font-mono">
            {formatCurrency(project.budget)}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm buildflow-hover-card buildflow-hover-card-blue">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Start Date
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 block">
            {formatDate(project.start_date)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Site mobilization date
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm buildflow-hover-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Target Completion
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 block">
            {formatDate(project.expected_end_date)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Scheduled handover deadline
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm buildflow-hover-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Actual End Date
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 block">
            {project.actual_end_date ? formatDate(project.actual_end_date) : "—"}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            {project.actual_end_date ? "Verified completion" : "Not completed"}
          </span>
        </div>
      </div>

      {/* DETAILED PROJECT SPECIFICATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scope & Description */}
        <div className="lg:col-span-2 space-y-6">
          <Card hoverEffect="default">
            <CardHeader>
              <CardTitle>Project Scope & Specifications</CardTitle>
              <CardDescription>
                Architectural details, deliverables, and operational parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {project.description || "No specific project description or scope notes provided yet."}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                    Site Location
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                    {project.location || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                    Client Organization
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                    {project.client_name || "Not specified"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subsequent Phases Readiness Card */}
          <Card hoverEffect="default" className="border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-base">Work Breakdown & Execution Modules</CardTitle>
              <CardDescription>
                Phases, tasks, workforce allocations, site inventory, and operational expenses connect to this project in upcoming build phases.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 buildflow-hover-card">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Phases & Tasks</span>
                  <span className="text-[10px] text-amber-500 font-medium">Phase 5</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 buildflow-hover-card">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Workforce & Site</span>
                  <span className="text-[10px] text-amber-500 font-medium">Phase 6</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 buildflow-hover-card">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Materials</span>
                  <span className="text-[10px] text-amber-500 font-medium">Phase 7</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 buildflow-hover-card">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Expenses</span>
                  <span className="text-[10px] text-amber-500 font-medium">Phase 8</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Metadata & System Info */}
        <div className="space-y-6">
          <Card hoverEffect="default">
            <CardHeader>
              <CardTitle className="text-base">System Metadata</CardTitle>
              <CardDescription>
                System logs and timestamps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 uppercase tracking-wider font-semibold text-[10px] block">
                  Project Record ID
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                  #{project.id}
                </span>
              </div>

              <div>
                <span className="text-slate-400 uppercase tracking-wider font-semibold text-[10px] block">
                  Created At
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {formatDateTime(project.created_at)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 uppercase tracking-wider font-semibold text-[10px] block">
                  Last Updated
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {formatDateTime(project.updated_at)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EDIT MODAL (ADMIN ONLY) */}
      {isAdmin && (
        <ProjectFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleProjectUpdated}
          initialData={project}
        />
      )}
    </div>
  );
}
