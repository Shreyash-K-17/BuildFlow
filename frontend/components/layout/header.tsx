"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const getPageTitle = (path: string): string => {
    if (path === "/dashboard" || path.startsWith("/dashboard/")) {
      return "Operations Dashboard";
    }
    if (path === "/projects" || path.startsWith("/projects/")) {
      return user?.role === "admin" ? "Project Portfolio" : "My Projects";
    }
    if (path === "/workers" || path.startsWith("/workers/")) {
      return "Workforce Management";
    }
    if (path === "/attendance" || path.startsWith("/attendance/")) {
      return "Site Attendance";
    }
    if (path === "/inventory" || path.startsWith("/inventory/")) {
      return "Materials & Inventory";
    }
    if (path === "/expenses" || path.startsWith("/expenses/")) {
      return "Project Expenses";
    }
    if (path === "/audit-logs" || path.startsWith("/audit-logs/")) {
      return "System Audit Logs";
    }
    if (path === "/profile" || path.startsWith("/profile/")) {
      return "My Profile";
    }
    return "Operations";
  };

  const pageTitle = getPageTitle(pathname);
  const isAdmin = user?.role === "admin";

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-4 sm:px-6 transition-colors">
      {/* Left side: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
          aria-label="Open sidebar menu"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right side: Role badge, Theme Toggle & User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <Badge variant={isAdmin ? "amber" : "info"} dot>
            {isAdmin ? "Admin Console" : "Field Worker"}
          </Badge>
        </div>

        <ThemeToggle />

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        <UserMenu />
      </div>
    </header>
  );
}
