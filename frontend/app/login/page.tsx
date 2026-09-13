"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const { user, login, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect immediately based on role
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.role === "admin") {
        router.replace("/dashboard");
      } else {
        router.replace("/projects");
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const loggedInUser = await login({
        email: email.trim(),
        password,
      });

      if (loggedInUser.role === "admin") {
        router.replace("/dashboard");
      } else {
        router.replace("/projects");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && typeof err.details === "object") {
          const detailsObj = err.details as Record<string, unknown>;
          const newFieldErrors: { email?: string; password?: string } = {};
          if (detailsObj.email) {
            newFieldErrors.email = Array.isArray(detailsObj.email)
              ? detailsObj.email.join(" ")
              : String(detailsObj.email);
          }
          if (detailsObj.password) {
            newFieldErrors.password = Array.isArray(detailsObj.password)
              ? detailsObj.password.join(" ")
              : String(detailsObj.password);
          }
          setFieldErrors(newFieldErrors);
        }
        setFormError(err.message || "Failed to authenticate. Please check your credentials.");
      } else {
        setFormError("A network error occurred. Please verify backend availability.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <svg
            className="animate-spin h-5 w-5 text-amber-500"
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
          <span>Loading session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Left Column: Brand & Construction Context (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-slate-900 border-r border-slate-800/80 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black shadow-md">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 20h20" />
              <path d="M5 20v-8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8" />
              <path d="M12 4v6" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-white">
              Build<span className="text-amber-500">Flow</span>
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-slate-400 font-medium">
              Construction Site Operations
            </span>
          </div>
        </div>

        {/* Middle Value Proposition */}
        <div className="relative z-10 max-w-md space-y-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            Precision Operations for Modern Job Sites.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Enterprise project scheduling, multi-tier attendance logging, material inventory transactions, and financial control built for construction contractors.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                ✓
              </span>
              <span>Role-governed field & administrative portals</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                ✓
              </span>
              <span>Atomic stock concurrency & audit ledger</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                ✓
              </span>
              <span>Multi-tenant organization security</span>
            </div>
          </div>
        </div>

        {/* Bottom System Version */}
        <div className="relative z-10 text-[11px] text-slate-500">
          BuildFlow Construction Management System • v1.0 Production
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="flex flex-1 flex-col justify-center items-center p-6 sm:p-12 lg:p-16 bg-slate-950">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M2 20h20" />
                <path d="M5 20v-8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8" />
                <path d="M12 4v6" />
              </svg>
            </div>
            <span className="font-bold text-xl text-white">
              Build<span className="text-amber-500">Flow</span>
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Sign in to your account
            </h2>
            <p className="mt-1.5 text-xs text-slate-400">
              Enter your verified email and password to access site operations.
            </p>
          </div>

          {/* Form Error Alert Banner */}
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in duration-150"
            >
              <svg
                className="w-4 h-4 text-red-400 shrink-0 mt-0.5"
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
              <span className="font-medium leading-relaxed">{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="login-email"
              type="email"
              label="Email Address"
              required
              autoComplete="email"
              autoFocus
              placeholder="admin@construction.com"
              value={email}
              error={fieldErrors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
            />

            <Input
              id="login-password"
              type="password"
              label="Password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              error={fieldErrors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              {isSubmitting ? "Authenticating..." : "Sign In to BuildFlow"}
            </Button>
          </form>

          {/* Register Link */}
          <div className="pt-4 border-t border-slate-900 text-center text-xs text-slate-400">
            <span>Need a new organization workspace? </span>
            <Link
              href="/register"
              className="font-semibold text-amber-500 hover:text-amber-400 hover:underline transition-colors"
            >
              Register Organization
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
