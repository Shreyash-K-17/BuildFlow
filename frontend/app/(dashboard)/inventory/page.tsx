"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Materials & Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track site stock levels, material procurement, deliveries, and warehouse supply.
          </p>
        </div>
      </div>

      <Card hoverEffect="default">
        <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg">
              📦
            </div>
            <div>
              <CardTitle className="text-base font-bold">Materials Management Module</CardTitle>
              <CardDescription className="text-xs">
                Supply chain and warehouse inventory tracking.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto text-xl">
            🏗️
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Inventory & Material Tracking
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Material batch tracking, stock replenishment alerts, and vendor delivery management will be active in the upcoming module release.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
