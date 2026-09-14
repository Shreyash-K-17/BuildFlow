import React from "react";
import Link from "next/link";
import { Project } from "@/types";
import { ProjectStatusBadge } from "./project-status-badge";
import { formatCompactCurrency, formatDate } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 buildflow-hover-card-amber buildflow-hover-card-interactive group"
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {project.name}
          </h3>
          {project.client_name && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Client: <span className="font-medium text-slate-700 dark:text-slate-300">{project.client_name}</span>
            </p>
          )}
        </div>
        <ProjectStatusBadge status={project.status} size="sm" />
      </div>

      {project.description && (
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
          {project.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
            Budget
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {formatCompactCurrency(project.budget)}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
            Location
          </span>
          <span className="text-slate-700 dark:text-slate-300 truncate block">
            {project.location || "—"}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
            Start Date
          </span>
          <span className="text-slate-700 dark:text-slate-300">
            {formatDate(project.start_date)}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
            Expected End
          </span>
          <span className="text-slate-700 dark:text-slate-300">
            {formatDate(project.expected_end_date)}
          </span>
        </div>
      </div>
    </Link>
  );
}
