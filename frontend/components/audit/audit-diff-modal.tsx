"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AuditLog } from "@/types";
import { AuditActionBadge, AuditEntityBadge } from "./audit-action-badge";
import { formatDateTime } from "@/lib/utils";

interface AuditDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLog | null;
}

export function AuditDiffModal({ isOpen, onClose, log }: AuditDiffModalProps) {
  const [viewRawJson, setViewRawJson] = useState<boolean>(false);

  if (!log) return null;

  const oldVals = log.old_values || {};
  const newVals = log.new_values || {};

  const allKeys = Array.from(
    new Set([...Object.keys(oldVals), ...Object.keys(newVals)])
  );

  const formatVal = (val: unknown): string => {
    if (val === null || val === undefined) return "null";
    if (typeof val === "object") return JSON.stringify(val);
    if (typeof val === "boolean") return val ? "true" : "false";
    return String(val);
  };

  const isCreate = log.action.toLowerCase() === "create";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Event Inspector"
      description="Immutable cryptographic record of entity mutation and change attribution."
      maxWidth="lg"
    >
      <div className="space-y-6 text-slate-900 dark:text-slate-100">
        {/* Header Metadata Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Action
            </span>
            <AuditActionBadge action={log.action} />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Entity
            </span>
            <div className="flex items-center gap-1.5">
              <AuditEntityBadge entityType={log.entity_type} />
              {log.entity_id && (
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                  #{log.entity_id}
                </span>
              )}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Actor
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-200">
              {log.user_id ? `User #${log.user_id}` : "System Service"}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Timestamp
            </span>
            <span className="text-[11px] text-slate-700 dark:text-slate-300">
              {formatDateTime(log.created_at)}
            </span>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between pt-1 border-b border-slate-200 dark:border-slate-800 pb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {isCreate ? "Initial Entity Attributes" : "Property Differential (Diff)"}
          </h4>
          <button
            type="button"
            onClick={() => setViewRawJson(!viewRawJson)}
            className="text-[11px] font-medium text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:underline transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>{viewRawJson ? "Visual Diff View" : "Raw JSON Inspector"}</span>
          </button>
        </div>

        {/* Content Area */}
        {viewRawJson ? (
          <div className="space-y-3">
            {log.old_values && (
              <div>
                <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 block mb-1">
                  Previous State (old_values):
                </span>
                <pre className="p-3 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-56">
                  {JSON.stringify(log.old_values, null, 2)}
                </pre>
              </div>
            )}
            {log.new_values && (
              <div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">
                  Mutated State (new_values):
                </span>
                <pre className="p-3 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-56">
                  {JSON.stringify(log.new_values, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {allKeys.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No property snapshot captured for this event.
              </div>
            ) : isCreate ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 overflow-hidden">
                {allKeys.map((key) => (
                  <div
                    key={key}
                    className="p-2.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5"
                  >
                    <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      {key}
                    </span>
                    <span className="font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono text-[11px] break-all">
                      {formatVal(newVals[key])}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 overflow-hidden">
                {allKeys.map((key) => {
                  const hasOld = key in oldVals;
                  const hasNew = key in newVals;
                  const changed = formatVal(oldVals[key]) !== formatVal(newVals[key]);

                  return (
                    <div
                      key={key}
                      className={`p-3 text-xs space-y-1.5 transition-colors ${
                        changed ? "bg-amber-500/5 dark:bg-amber-500/[0.04]" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                          {key}
                        </span>
                        {changed && (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            MODIFIED
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 break-all">
                          <span className="text-[9px] uppercase tracking-wider text-red-600 dark:text-red-400/80 block mb-0.5">
                            Before:
                          </span>
                          {hasOld ? formatVal(oldVals[key]) : "— (undefined)"}
                        </div>
                        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 break-all">
                          <span className="text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400/80 block mb-0.5">
                            After:
                          </span>
                          {hasNew ? formatVal(newVals[key]) : "— (undefined)"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Inspector
          </Button>
        </div>
      </div>
    </Modal>
  );
}
