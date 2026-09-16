"use client";

import React from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ExpensesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl font-bold">
            🛡️
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Financial Management Restricted
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Project financial ledgers and expense tracking are restricted to administrative personnel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Project Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track site disbursements, equipment rentals, contractor payments, and budget burn rate.
          </p>
        </div>
      </div>

      <Card hoverEffect="default">
        <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg">
              💳
            </div>
            <div>
              <CardTitle className="text-base font-bold">Financial Accounting Module</CardTitle>
              <CardDescription className="text-xs">
                Budget ledger, invoice approvals, and cost control.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto text-xl">
            📊
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Site Expenses & Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Detailed expense logging, purchase order reconciliation, and multi-currency cost accounting will be active in the upcoming module release.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
