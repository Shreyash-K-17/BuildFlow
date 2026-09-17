"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  const [isPending, startTransition] = useTransition();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Log sanitized error details to console for debugging
    console.error("Dashboard error boundary caught an error:", error);
  }, [error]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    startTransition(() => {
      reset();
    });
  };

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-6 animate-in fade-in-50 duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-6 sm:p-8 shadow-sm text-center">
        {/* Warning Icon Badge */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-inner">
          <svg
            className="h-7 w-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        {/* Header */}
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
          Something went wrong in this section
        </h2>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
          An unexpected error occurred while rendering this part of the dashboard.
          Your session is safe and the rest of the application remains available.
        </p>

        {/* Error Reference ID (Safe, non-leaking identifier) */}
        {error?.digest && (
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-400">
            <span>Reference ID:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {error.digest.slice(0, 16)}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={handleRetry}
            isLoading={isPending}
            disabled={isPending}
            className="w-full sm:w-auto min-w-[120px]"
          >
            <svg
              className={`w-4 h-4 mr-1.5 ${isPending ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </Button>

          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
            >
              Back to Dashboard
            </Button>
          </Link>

          <Button
            type="button"
            variant="ghost"
            onClick={handleReload}
            className="w-full sm:w-auto text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Reload Page
          </Button>
        </div>

        {retryCount > 2 && (
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            If retrying doesn&apos;t resolve the issue, try navigating to another section or reloading the page.
          </p>
        )}
      </div>
    </div>
  );
}
