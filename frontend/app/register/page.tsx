"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const { user, register, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [organizationName, setOrganizationName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<{
    organization_name?: string;
    username?: string;
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect immediately
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
    const errors: {
      organization_name?: string;
      username?: string;
      email?: string;
      password?: string;
    } = {};

    if (!organizationName.trim()) {
      errors.organization_name = "Organization name is required.";
    } else if (organizationName.trim().length < 2) {
      errors.organization_name = "Organization name must be at least 2 characters.";
    }

    if (!username.trim()) {
      errors.username = "Administrator username is required.";
    } else if (username.trim().length < 3) {
      errors.username = "Username must be at least 3 characters.";
    }

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else {
      if (password.length < 8) {
        errors.password = "Password must be at least 8 characters long.";
      } else if (!/[A-Z]/.test(password)) {
        errors.password = "Password must contain at least one uppercase letter.";
      } else if (!/[a-z]/.test(password)) {
        errors.password = "Password must contain at least one lowercase letter.";
      } else if (!/[0-9]/.test(password)) {
        errors.password = "Password must contain at least one number.";
      }
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
      await register({
        organization_name: organizationName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });

      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && typeof err.details === "object") {
          const detailsObj = err.details as Record<string, unknown>;
          const newFieldErrors: typeof fieldErrors = {};
          if (detailsObj.organization_name) {
            newFieldErrors.organization_name = Array.isArray(detailsObj.organization_name)
              ? detailsObj.organization_name.join(" ")
              : String(detailsObj.organization_name);
          }
          if (detailsObj.username) {
            newFieldErrors.username = Array.isArray(detailsObj.username)
              ? detailsObj.username.join(" ")
              : String(detailsObj.username);
          }
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
        setFormError(err.message || "Failed to create organization account.");
      } else {
        setFormError("A network error occurred. Please verify backend connectivity.");
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
    <div className="flex min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Left Column: Brand & Architecture (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-slate-900 text-slate-100 border-r border-slate-800/80 relative overflow-hidden">
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
              Enterprise Workspace Setup
            </span>
          </div>
        </div>

        {/* Middle Value Proposition */}
        <div className="relative z-10 max-w-md space-y-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            Deploy your Company Construction Workspace.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Register your contracting or construction firm to establish an isolated organization partition with full audit logging and multi-site project control.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                ✓
              </span>
              <span>Isolated database schema & tenant boundaries</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                ✓
              </span>
              <span>Dedicated administrator management credentials</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                ✓
              </span>
              <span>Direct field workforce provisioning in Phase 3</span>
            </div>
          </div>
        </div>

        {/* Bottom System Info */}
        <div className="relative z-10 text-[11px] text-slate-500">
          BuildFlow Construction Operations System • Administrative Provisioning
        </div>
      </div>

      {/* Right Column: Register Form */}
      <div className="flex flex-1 flex-col justify-center items-center p-6 sm:p-12 lg:p-16 bg-white dark:bg-slate-950">
        <div className="w-full max-w-md space-y-7">
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
            <span className="font-bold text-xl text-slate-900 dark:text-white">
              Build<span className="text-amber-500">Flow</span>
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Register Organization
            </h2>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Create a new company account to initialize your construction operations workspace.
            </p>
          </div>

          {/* Form Error Alert Banner */}
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-300 flex items-start gap-2.5 animate-in fade-in duration-150"
            >
              <svg
                className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5"
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
              id="register-org"
              type="text"
              label="Organization Name"
              required
              autoFocus
              placeholder="e.g. Apex Infrastructure Ltd"
              value={organizationName}
              error={fieldErrors.organization_name}
              onChange={(e) => {
                setOrganizationName(e.target.value);
                if (fieldErrors.organization_name) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    organization_name: undefined,
                  }));
                }
              }}
            />

            <Input
              id="register-username"
              type="text"
              label="Admin Username"
              required
              placeholder="e.g. site_manager"
              value={username}
              error={fieldErrors.username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    username: undefined,
                  }));
                }
              }}
            />

            <Input
              id="register-email"
              type="email"
              label="Admin Work Email"
              required
              autoComplete="email"
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
              id="register-password"
              type="password"
              label="Password"
              required
              autoComplete="new-password"
              helperText="Min 8 characters with at least 1 uppercase, 1 lowercase, and 1 number."
              placeholder="••••••••"
              value={password}
              error={fieldErrors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    password: undefined,
                  }));
                }
              }}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full mt-3"
            >
              {isSubmitting
                ? "Creating Workspace..."
                : "Create Organization Account"}
            </Button>
          </form>

          {/* Login Link */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>Already have an account? </span>
            <Link
              href="/login"
              className="font-semibold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:underline transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
