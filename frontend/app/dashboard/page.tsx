import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>BuildFlow Dashboard</CardTitle>
          <CardDescription>
            Admin Dashboard placeholder. Dashboard interface will be constructed in subsequent phases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Phase 1 foundation ready.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
