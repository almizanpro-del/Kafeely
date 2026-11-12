import "server-only";
import { db } from "@/lib/db";

export const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

export async function getNotifications(userId: string) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
}

export async function getUnreadCount(userId: string) {
  return db.notification.count({ where: { userId, read: false } });
}

export async function markNotificationsRead(userId: string) {
  await db.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

export async function writeAudit(entry: {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  detail?: string;
  ip?: string;
}) {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      detail: entry.detail ?? null,
      ip: entry.ip ?? "127.0.0.1",
    },
  });
}

/** Simple weekly buckets for the last n weeks (oldest first). */
export function weeklyBuckets(dates: Date[], weeks = 8): number[] {
  const now = Date.now();
  const arr = new Array(weeks).fill(0);
  for (const d of dates) {
    const diff = Math.floor((now - d.getTime()) / (7 * 86_400_000));
    if (diff >= 0 && diff < weeks) arr[weeks - 1 - diff]++;
  }
  return arr;
}
