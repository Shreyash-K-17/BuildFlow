import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>BuildFlow Authentication</CardTitle>
          <CardDescription>
            Phase 1 Authentication placeholder. Login form will be connected in Phase 2.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Authentication infrastructure initialized.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
