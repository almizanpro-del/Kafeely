/**
 * Super-Admin console — Compliance Audit Trail tab.
 * Extracted from the former AdminPortal monolith (code-review fix:
 * "component splitting").
 */
import React from 'react';
import { AuditLog } from '../../types';
import { content } from '../../content/translations';

type AdminCopy = typeof content.en.admin;

export const AuditTab: React.FC<{ logs: AuditLog[]; t: AdminCopy }> = ({ logs, t }) => (
  <div className="space-y-3">
    <div className="text-xs text-slate-400 mb-2">{t.auditTrailTitle}</div>
    <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/30">
      {logs.map((log) => (
        <div key={log.id} className="p-3 text-xs">
          <div className="flex items-center justify-between gap-2 text-slate-400 text-[11px] mb-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[#C5A880]">{log.action}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300">{log.performedBy}</span>
            </div>
            <span className="font-mono text-slate-400">{log.timestamp}</span>
          </div>
          <div className="text-slate-200">
            {log.targetEmail && <span className="font-mono text-slate-400">[{log.targetEmail}] </span>}
            {log.details}
          </div>
        </div>
      ))}
    </div>
  </div>
);
