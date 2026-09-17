"use client";

import React, { useEffect, useState, useTransition } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [isPending, startTransition] = useTransition();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    console.error("Global application error caught by boundary:", error);
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
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans bg-slate-950 text-slate-100 antialiased items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-xl text-center">
          {/* Logo / Warning Icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
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

          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Build<span className="text-amber-500">Flow</span>
          </h1>

          <h2 className="mt-3 text-base font-semibold text-slate-200">
            Critical Application Error
          </h2>

          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            A critical error occurred while loading the application shell. Please attempt to recover by retrying or refreshing the application.
          </p>

          {error?.digest && (
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs font-mono text-slate-400">
              <span>Reference ID:</span>
              <span className="font-semibold text-slate-200">
                {error.digest.slice(0, 16)}
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetry}
              disabled={isPending}
              className="w-full sm:w-auto min-w-[120px] inline-flex items-center justify-center font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 h-10 px-4 text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Retrying..." : "Try Again"}
            </button>

            <button
              type="button"
              onClick={handleReload}
              className="w-full sm:w-auto inline-flex items-center justify-center font-medium rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 h-10 px-4 text-sm transition-colors cursor-pointer"
            >
              Reload App
            </button>
          </div>

          {retryCount > 2 && (
            <p className="mt-4 text-xs text-slate-500">
              If refreshing doesn&apos;t work, please verify your network connection and server status.
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
