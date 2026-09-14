"use client";

import React from "react";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const initials = user.username
    ? user.username.slice(0, 2).toUpperCase()
    : "BF";

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            User Profile
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authenticated account identity and permission credentials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isAdmin ? "amber" : "info"} dot>
            {isAdmin ? "Admin Role" : "Worker Role"}
          </Badge>
        </div>
      </div>

      {/* Profile Overview Card */}
      <Card hoverEffect="default">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-bold text-xl shadow-md border-2 border-amber-400">
              {initials}
            </div>
            <div>
              <CardTitle className="text-xl">{user.username}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                System Username
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user.username}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Email Address
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user.email}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Assigned Role
              </span>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={isAdmin ? "amber" : "info"}>
                  {user.role.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Account Status
              </span>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="success" dot>
                  Active Session
                </Badge>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4 text-xs text-slate-500 dark:text-slate-400">
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
              Access Governance:
            </p>
            <p>
              Your permissions are enforced server-side based on the verified credentials of your organization.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
