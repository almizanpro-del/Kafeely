/**
 * Waitlist / interest-capture service (PRD 4.2, FR-01 … FR-03, FR-21, FR-24).
 *
 * Server-side replacement for the browser-era localStorage store:
 *  - one record per email, roles kept as tags (FR-02);
 *  - new submissions are staged in `pending_update` and applied only after
 *    the address re-confirms the double opt-in link (FR-03);
 *  - verification tokens are single-use, hashed at rest, and expire;
 *  - erasure deletes the row and writes a PII-free audit entry (FR-24).
 *
 * Responses never reveal whether an address was already on the list.
 */

import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { waitlistEntries } from '../../../db/schema.ts';
import type { Db } from '../db.ts';
import { HttpError, siteUrl } from '../env.ts';
import { hmacToken, randomToken } from '../crypto.ts';
import { rateLimit } from '../ratelimit.ts';
import { writeAudit } from '../audit.ts';
import { emailHtml, type Mailer } from '../mailer.ts';
import type { WaitlistSubmissionInput } from '../validation.ts';

export const WAITLIST_TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 h

const GENERIC_SUBMIT_MESSAGE =
  'Thank you — check your inbox for a confirmation link. Your details are saved once you confirm.';

interface StagedUpdate {
  receivedAt: string;
  data: {
    role: WaitlistSubmissionInput['role'];
    subRole: string;
    payload: Record<string, unknown>;
    marketingConsent: boolean;
    contactConsent: boolean;
    privacyConsentVersion: string;
    consentRecord?: unknown;
  };
}

/** Everything that is not a dedicated column lives in the `payload` JSON. */
function payloadOf(input: WaitlistSubmissionInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const keys = [
    'name',
    'firm',
    'organisation',
    'partnerType',
    'investorType',
    'area',
    'unitType',
    'rentBand',
    'moveInTiming',
    'phone',
    'message',
    'preferredCallTime',
  ] as const;
  for (const key of keys) {
    const value = input[key];
    if (value !== undefined && value !== '') payload[key] = value;
  }
  return payload;
}

export interface WaitlistMeta {
  ip?: string | null;
  mailer: Mailer;
  /** Test-only override; production always uses SITE_URL. */
  linkBase?: string | null;
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '23505';
}

async function sendVerificationEmail(
  meta: WaitlistMeta,
  email: string,
  token: string,
): Promise<void> {
  const linkBase = (meta.linkBase ?? siteUrl()).replace(/\/+$/, '');
  await meta.mailer.send({
    to: email,
    subject: 'Confirm your Kafeely waiting-list details',
    html: emailHtml(
      'Confirm your details',
      `<p>Hello,</p>
       <p>Please confirm this address so we can keep your Kafeely waiting-list details accurate.
       The link is single-use and expires in 48 hours.</p>
       <p style="font-size:12px;color:#475569">Or paste this one-time token into the confirmation form:<br>
       <code>${token}</code></p>
       <p style="font-size:12px;color:#475569">If you did not submit these details, you can ignore this email.</p>`,
      `${linkBase}/#verify-waitlist?token=${encodeURIComponent(token)}`,
    ),
  });
}

/**
 * Records a new waitlist submission or stages an update to an existing one.
 * The response is identical in both cases (double opt-in, no enumeration).
 */
export async function submitWaitlist(
  db: Db,
  input: WaitlistSubmissionInput,
  meta: WaitlistMeta,
): Promise<{ message: string }> {
  await rateLimit(db, `ip:waitlist:${meta.ip ?? 'unknown'}`, 20, 60 * 60);
  await rateLimit(db, `email:waitlist:${input.email}`, 5, 60 * 60);

  const token = randomToken();
  const tokenHash = hmacToken(token);
  const expiresAt = new Date(Date.now() + WAITLIST_TOKEN_TTL_MS);
  const payload = payloadOf(input);

  const existingRows = await db
    .select()
    .from(waitlistEntries)
    .where(eq(waitlistEntries.email, input.email))
    .limit(1);
  const existing = existingRows[0];

  if (existing) {
    const staged: StagedUpdate = {
      receivedAt: new Date().toISOString(),
      data: {
        role: input.role,
        subRole: input.subRole,
        payload,
        marketingConsent: input.marketingConsent,
        contactConsent: input.contactConsent,
        privacyConsentVersion: input.privacyConsentVersion,
        consentRecord: input.consentRecord,
      },
    };
    await db
      .update(waitlistEntries)
      .set({
        pendingUpdate: staged,
        verificationTokenHash: tokenHash,
        verificationExpiresAt: expiresAt,
      })
      .where(eq(waitlistEntries.id, existing.id));

    await writeAudit(db, {
      action: 'UPDATE_STAGED',
      performedBy: 'User Web Submission',
      targetId: existing.id,
      role: input.role,
      details:
        'Duplicate email submission received. Changes staged and will apply only after the address is re-confirmed (FR-03). No direct edit was made.',
    });
  } else {
    try {
      const inserted = await db
        .insert(waitlistEntries)
        .values({
          email: input.email,
          role: input.role,
          subRole: input.subRole,
          roleTags: [input.role],
          payload,
          marketingConsent: input.marketingConsent,
          contactConsent: input.contactConsent,
          privacyConsentVersion: input.privacyConsentVersion,
          consentRecord: input.consentRecord ?? null,
          verificationTokenHash: tokenHash,
          verificationExpiresAt: expiresAt,
        })
        .returning();
      await writeAudit(db, {
        action: 'CREATE',
        performedBy: 'User Web Submission',
        targetId: inserted[0]?.id ?? null,
        role: input.role,
        details: 'Created new entry. Double opt-in pending verification.',
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // A concurrent submission won the race; fall back to staging an update.
      await db
        .update(waitlistEntries)
        .set({
          pendingUpdate: {
            receivedAt: new Date().toISOString(),
            data: {
              role: input.role,
              subRole: input.subRole,
              payload,
              marketingConsent: input.marketingConsent,
              contactConsent: input.contactConsent,
              privacyConsentVersion: input.privacyConsentVersion,
              consentRecord: input.consentRecord,
            },
          },
          verificationTokenHash: tokenHash,
          verificationExpiresAt: expiresAt,
        })
        .where(eq(waitlistEntries.email, input.email));
      await writeAudit(db, {
        action: 'UPDATE_STAGED',
        performedBy: 'User Web Submission',
        role: input.role,
        details: 'Concurrent duplicate submission staged for re-confirmation (FR-03).',
      });
    }
  }

  try {
    await sendVerificationEmail(meta, input.email, token);
  } catch (error) {
    console.error('[waitlist] confirmation email failed:', error);
  }

  return { message: GENERIC_SUBMIT_MESSAGE };
}

/** Applies the double opt-in: marks verified and applies any staged update. */
export async function verifyWaitlist(
  db: Db,
  rawToken: string,
): Promise<{ message: string }> {
  const tokenHash = hmacToken(rawToken);
  const rows = await db
    .select()
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.verificationTokenHash, tokenHash),
        isNull(waitlistEntries.deletedAt),
        sql`${waitlistEntries.verificationExpiresAt} > now()`,
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new HttpError(
      400,
      'invalid_token',
      'This confirmation link is invalid or has expired. Please submit the form again.',
    );
  }

  const staged = row.pendingUpdate as StagedUpdate | null;
  const data = staged?.data;
  const nextRoleTags = data
    ? Array.from(new Set([...(row.roleTags ?? [row.role]), data.role]))
    : row.roleTags;

  const updated = await db
    .update(waitlistEntries)
    .set({
      verified: true,
      verifiedAt: sql`now()`,
      verificationTokenHash: null,
      verificationExpiresAt: null,
      pendingUpdate: null,
      ...(data
        ? {
            role: data.role,
            subRole: data.subRole,
            payload: data.payload,
            roleTags: nextRoleTags,
            marketingConsent: data.marketingConsent,
            contactConsent: data.contactConsent,
            privacyConsentVersion: data.privacyConsentVersion,
            consentRecord: (data.consentRecord ?? null) as Record<string, unknown> | null,
          }
        : {}),
    })
    .where(
      and(
        eq(waitlistEntries.id, row.id),
        eq(waitlistEntries.verificationTokenHash, tokenHash),
      ),
    )
    .returning();

  if (!updated[0]) {
    throw new HttpError(
      400,
      'invalid_token',
      'This confirmation link has already been used. Please submit the form again if you need to change your details.',
    );
  }

  await writeAudit(db, {
    action: data ? 'UPDATE_APPLIED' : 'DOUBLE_OPT_IN_VERIFY',
    performedBy: 'Email Verification Link Token',
    targetId: row.id,
    role: data?.role ?? row.role,
    details: data
      ? 'Re-confirmation received. The previously staged duplicate submission was applied (FR-03).'
      : 'Email confirmed via double opt-in link. Status upgraded to Verified.',
  });

  return { message: 'Your details are confirmed. Thank you for joining the Kafeely waiting list.' };
}

/* ------------------------------------------------------------------ */
/* Admin console                                                       */
/* ------------------------------------------------------------------ */

export interface WaitlistEntryView {
  id: string;
  email: string;
  role: string;
  subRole: string;
  roleTags: string[];
  verified: boolean;
  verifiedAt: string | null;
  submittedAt: string;
  marketingConsent: boolean;
  contactConsent: boolean;
  privacyConsentVersion: string;
  consentRecord: unknown;
  pendingUpdate: StagedUpdate | null;
  [key: string]: unknown;
}

export async function listWaitlist(db: Db, limit = 1000): Promise<WaitlistEntryView[]> {
  const rows = await db
    .select()
    .from(waitlistEntries)
    .where(isNull(waitlistEntries.deletedAt))
    .orderBy(desc(waitlistEntries.submittedAt))
    .limit(Math.min(Math.max(limit, 1), 5000));

  return rows.map((row) => ({
    ...(row.payload as Record<string, unknown>),
    id: row.id,
    email: row.email,
    role: row.role,
    subRole: row.subRole,
    roleTags: row.roleTags ?? [row.role],
    verified: row.verified,
    verifiedAt: row.verifiedAt ? new Date(row.verifiedAt).toISOString() : null,
    submittedAt: new Date(row.submittedAt).toISOString(),
    marketingConsent: row.marketingConsent,
    contactConsent: row.contactConsent,
    privacyConsentVersion: row.privacyConsentVersion,
    consentRecord: row.consentRecord,
    pendingUpdate: row.pendingUpdate as StagedUpdate | null,
  }));
}

/** Hard-deletes one record (PDPL right of erasure) and logs it without PII. */
export async function deleteWaitlistEntry(
  db: Db,
  id: string,
  actorEmail: string,
): Promise<{ message: string }> {
  if (!/^[0-9a-f-]{16,64}$/i.test(id)) {
    throw new HttpError(422, 'validation_error', 'Unknown waitlist record.');
  }
  const deleted = await db
    .delete(waitlistEntries)
    .where(eq(waitlistEntries.id, id))
    .returning();
  if (!deleted[0]) {
    throw new HttpError(404, 'record_not_found', 'Waitlist record not found.');
  }
  await writeAudit(db, {
    action: 'DELETE_REQUESTED',
    performedBy: actorEmail,
    details:
      'One waitlist record permanently erased following an erasure request. Per FR-24, this log entry deliberately contains no personal data of the deleted record.',
  });
  return { message: 'The waitlist record was permanently erased.' };
}

/** FR-21: record who exported how many rows (no personal data in the log). */
export async function logWaitlistExport(
  db: Db,
  actorEmail: string,
  count: number,
): Promise<void> {
  await writeAudit(db, {
    action: 'EXPORT_CSV',
    performedBy: actorEmail,
    details: `CSV export of ${count} waitlist record(s) under the current filters.`,
  });
}
