"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LowStockMaterialSummary } from "@/types";

interface LowStockMaterialsCardProps {
  materials: {
    total_active: number;
    low_stock_count: number;
    low_stock_materials: LowStockMaterialSummary[];
  };
}

export function LowStockMaterialsCard({ materials }: LowStockMaterialsCardProps) {
  const { total_active, low_stock_count, low_stock_materials } = materials;
  const hasLowStock = low_stock_count > 0;

  return (
    <Card hoverEffect="default" className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Inventory & Material Health</CardTitle>
            <CardDescription>Active stock thresholds and procurement alerts</CardDescription>
          </div>
          {hasLowStock ? (
            <Badge variant="danger" dot className="animate-pulse">
              {low_stock_count} Low Stock {low_stock_count === 1 ? "Item" : "Items"}
            </Badge>
          ) : (
            <Badge variant="success" dot>
              Stocks Healthy
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasLowStock ? (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">
                      Material
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-right">
                      Current
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-right">
                      Min Req
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-center">
                      Unit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {low_stock_materials.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-red-600 dark:text-red-400">
                        {item.current_stock}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400">
                        {item.minimum_stock}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500 uppercase text-[10px]">
                        {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <span>Total Active Materials Tracked: {total_active}</span>
              <span className="text-red-500 dark:text-red-400 font-medium">
                Replenishment Required
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              All active materials are above minimum stock.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {total_active} active material {total_active === 1 ? "type" : "types"} monitored in inventory.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
