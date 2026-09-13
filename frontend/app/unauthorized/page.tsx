"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedPage() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
      <Card className="w-full max-w-md border-red-500/30 bg-slate-900 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 mb-3">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <CardTitle className="text-xl font-bold text-white">
            Access Restricted
          </CardTitle>
          <p className="text-xs uppercase tracking-wider text-red-400 font-semibold mt-1">
            HTTP 403 Forbidden
          </p>
        </CardHeader>
        <CardContent className="space-y-5 text-center text-sm text-slate-400">
          <p>
            You do not have administrative privileges to access this operational area. Your account is assigned to the{" "}
            <span className="font-semibold text-slate-200 capitalize">
              {user?.role || "worker"}
            </span>{" "}
            role.
          </p>

          <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 text-xs text-left space-y-1">
            <p className="text-slate-500">Authenticated Identity:</p>
            <p className="font-medium text-slate-300 truncate">
              {user?.username} ({user?.email})
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            {isAuthenticated ? (
              <Link href="/projects" className="flex-1">
                <Button variant="primary" className="w-full">
                  Go to My Projects
                </Button>
              </Link>
            ) : (
              <Link href="/login" className="flex-1">
                <Button variant="primary" className="w-full">
                  Return to Login
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex-1"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
