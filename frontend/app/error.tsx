"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  const [isPending, startTransition] = useTransition();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    console.error("Root application error caught by boundary:", error);
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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm text-center">
        {/* Brand Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 20h20" />
            <path d="M5 20v-8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8" />
            <path d="M12 4v6" />
          </svg>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
          Build<span className="text-amber-500">Flow</span>
        </h1>

        <h2 className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-200">
          Something went wrong
        </h2>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          We encountered an unexpected error while loading this page. Please try again or return to the main portal.
        </p>

        {error?.digest && (
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-400">
            <span>Reference ID:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {error.digest.slice(0, 16)}
            </span>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={handleRetry}
            isLoading={isPending}
            disabled={isPending}
            className="w-full sm:w-auto min-w-[120px]"
          >
            Try Again
          </Button>

          <Link href="/login" className="w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
            >
              Go to Login
            </Button>
          </Link>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleReload}
            className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 underline cursor-pointer"
          >
            Reload Application
          </button>
        </div>

        {retryCount > 2 && (
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            If the problem persists, please reload the page or check your connection.
          </p>
        )}
      </div>
    </div>
  );
}
