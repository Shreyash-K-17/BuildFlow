"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function GatewayPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        if (user.role === "admin") {
          router.replace("/dashboard");
        } else {
          router.replace("/projects");
        }
      } else {
        router.replace("/login");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="flex flex-col items-center max-w-sm text-center">
        {/* Construction Icon */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-6">
          <svg
            className="w-8 h-8 text-amber-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 20h20" />
            <path d="M5 20v-8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8" />
            <path d="M12 4v6" />
            <path d="m8 6 4-2 4 2" />
          </svg>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">
          Build<span className="text-amber-500">Flow</span>
        </h1>
        <p className="mt-2 text-xs font-medium uppercase tracking-widest text-slate-400">
          Construction Operations & Management
        </p>

        <div className="mt-8 flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <svg
            className="animate-spin h-4 w-4 text-amber-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Authenticating session...</span>
        </div>
      </div>
    </div>
  );
}
