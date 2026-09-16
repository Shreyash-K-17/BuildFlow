"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Project, ProjectsResponseData } from "@/types";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectAttendanceCard } from "@/components/attendance/project-attendance-card";

const ATTENDANCE_PROJECT_STORAGE_KEY = "buildflow-attendance-selected-project";

function getSavedProjectId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(ATTENDANCE_PROJECT_STORAGE_KEY);
    if (!saved) return null;
    const parsed = parseInt(saved, 10);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

function saveSelectedProjectId(id: number | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id !== null) {
      localStorage.setItem(ATTENDANCE_PROJECT_STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(ATTENDANCE_PROJECT_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export default function AttendanceHubPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => getSavedProjectId());
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveSelectedProject = useCallback((loadedProjects: Project[]) => {
    if (loadedProjects.length === 0) {
      setSelectedProjectId(null);
      saveSelectedProjectId(null);
      return;
    }

    const savedId = getSavedProjectId();
    const existing = savedId !== null ? loadedProjects.find((p) => p.id === savedId) : undefined;

    if (existing) {
      setSelectedProjectId(existing.id);
      saveSelectedProjectId(existing.id);
    } else {
      const fallbackId = loadedProjects[0].id;
      setSelectedProjectId(fallbackId);
      saveSelectedProjectId(fallbackId);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    setError(null);
    try {
      const data = await api.get<ProjectsResponseData>("/projects");
      const loadedProjects = data.projects || [];
      setProjects(loadedProjects);
      resolveSelectedProject(loadedProjects);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load projects list.");
      }
    } finally {
      setIsLoadingProjects(false);
    }
  }, [resolveSelectedProject]);

  useEffect(() => {
    let isSubscribed = true;

    api
      .get<ProjectsResponseData>("/projects")
      .then((data) => {
        if (!isSubscribed) return;
        const loadedProjects = data.projects || [];
        setProjects(loadedProjects);
        resolveSelectedProject(loadedProjects);
        setIsLoadingProjects(false);
      })
      .catch((err) => {
        if (!isSubscribed) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load projects list.");
        }
        setIsLoadingProjects(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [resolveSelectedProject]);

  const handleProjectSelect = (projectId: number) => {
    setSelectedProjectId(projectId);
    saveSelectedProjectId(projectId);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Attendance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? "Track daily workforce site muster, shift timestamps, and worker presence across projects."
              : "Review your personal site attendance logs and verified hours by project."}
          </p>
        </div>
      </div>

      {/* Project Selector Card */}
      <Card hoverEffect="default">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Select Site Project
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Attendance records are organized by construction project.
            </p>
          </div>

          {/* Project Select Dropdown */}
          <div className="w-full sm:w-72 shrink-0">
            <select
              id="attendance-project-select"
              value={selectedProjectId || ""}
              onChange={(e) => handleProjectSelect(parseInt(e.target.value, 10))}
              disabled={isLoadingProjects || projects.length === 0}
              className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-medium transition-colors cursor-pointer"
              aria-label="Select Project"
            >
              {projects.length === 0 ? (
                <option value="">
                  {isLoadingProjects ? "-- Loading projects... --" : "-- No projects found --"}
                </option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.status.replace("_", " ")})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {selectedProject && (
          <div className="px-5 py-3.5 sm:px-6 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Active Project:
              </span>
              <span className="text-slate-900 dark:text-slate-100 font-medium">
                {selectedProject.name}
              </span>
              {selectedProject.location && (
                <span className="text-slate-500">• {selectedProject.location}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
              <span>Status:</span>
              <span className="font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {selectedProject.status.replace("_", " ")}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Loading Skeleton */}
      {isLoadingProjects ? (
        <div className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 animate-pulse" />
      ) : error ? (
        /* Error State */
        <div className="p-8 text-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 space-y-3">
          <p className="text-sm font-medium">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchProjects}
            className="text-xs"
          >
            Try Again
          </Button>
        </div>
      ) : projects.length === 0 ? (
        /* No Projects State */
        <div className="p-10 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl">
            🏗️
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              No construction projects found.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {isAdmin
                ? "Create a project in the Projects section to start tracking workforce attendance."
                : "Projects and attendance logs will appear here once configured by your organization."}
            </p>
          </div>
        </div>
      ) : selectedProjectId ? (
        /* Project Attendance Log Card */
        <ProjectAttendanceCard key={selectedProjectId} projectId={selectedProjectId} />
      ) : null}
    </div>
  );
}
