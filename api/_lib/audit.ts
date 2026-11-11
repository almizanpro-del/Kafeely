/**
 * Append-only audit writer (PRD §4/§6 parity with the client-side trail).
 *
 * Action names mirror the existing ADMIN_* vocabulary so the console's audit
 * view can merge both eras. Erasure-related entries carry no personal data:
 * `targetEmail` is null there (FR-24).
 */

import { auditLogs } from '../../db/schema.ts';
import type { Db } from './db.ts';

export interface AuditEntry {
  action: string;
  performedBy: string;
  targetEmail?: string | null;
  targetId?: string | null;
  role?: string | null;
  details: string;
}

/** Writes one audit row. Audit failures never break the primary operation —
 * they are logged for operators instead. */
export async function writeAudit(db: Db, entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      action: entry.action,
      performedBy: entry.performedBy,
      targetEmail: entry.targetEmail ?? null,
      targetId: entry.targetId ?? null,
      role: entry.role ?? null,
      details: entry.details,
    });
  } catch (error) {
    console.error('[audit] failed to write entry:', entry.action, error);
  }
}
