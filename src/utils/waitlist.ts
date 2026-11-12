/**
 * Waitlist API client. All records live server-side; this module only maps
 * the wire shape onto the UI's `WaitlistEntry` type.
 */
import { WaitlistEntry } from '../types';
import { apiFetch } from './apiClient';

interface ServerWaitlistEntry {
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
  consentRecord?: unknown;
  pendingUpdate?: unknown;
  [key: string]: unknown;
}

interface WaitlistListResponse {
  entries: ServerWaitlistEntry[];
}

function toEntry(row: ServerWaitlistEntry): WaitlistEntry {
  return {
    ...(row as unknown as WaitlistEntry),
    id: row.id,
    email: row.email,
    role: row.role as WaitlistEntry['role'],
    subRole: row.subRole,
    roleTags: (row.roleTags ?? [row.role]) as WaitlistEntry['roleTags'],
    verified: row.verified,
    verifiedAt: row.verifiedAt ?? undefined,
    submittedAt: row.submittedAt,
    marketingConsent: row.marketingConsent,
    contactConsent: row.contactConsent,
    privacyConsentVersion: row.privacyConsentVersion,
    consentRecord: (row.consentRecord as WaitlistEntry['consentRecord']) ?? undefined,
    pendingUpdate: row.pendingUpdate as WaitlistEntry['pendingUpdate'],
  };
}

export interface WaitlistSubmitInput {
  role: WaitlistEntry['role'];
  subRole: string;
  email: string;
  name?: string;
  firm?: string;
  organisation?: string;
  partnerType?: string;
  investorType?: string;
  area?: string;
  unitType?: string;
  rentBand?: string;
  moveInTiming?: string;
  phone?: string;
  message?: string;
  preferredCallTime?: string;
  marketingConsent: boolean;
  contactConsent: boolean;
  privacyConsentVersion: string;
  consentRecord?: WaitlistEntry['consentRecord'];
}

/** POST /api/waitlist — identical response for new and duplicate emails. */
export async function submitWaitlist(input: WaitlistSubmitInput): Promise<string> {
  const result = await apiFetch<{ message: string }>('/api/waitlist', {
    method: 'POST',
    body: input,
  });
  return result.message;
}

/** POST /api/waitlist/verify — completes the emailed double opt-in. */
export async function verifyWaitlistWithToken(token: string): Promise<string> {
  const result = await apiFetch<{ message: string }>('/api/waitlist/verify', {
    method: 'POST',
    body: { token },
  });
  return result.message;
}

/** GET /api/admin/waitlist — console records view. */
export async function fetchWaitlist(): Promise<WaitlistEntry[]> {
  const result = await apiFetch<WaitlistListResponse>('/api/admin/waitlist');
  return result.entries.map(toEntry);
}

/** DELETE /api/admin/waitlist/:id — PDPL erasure (Super-Admin only). */
export async function deleteWaitlistRecord(id: string): Promise<string> {
  const result = await apiFetch<{ message: string }>(
    `/api/admin/waitlist/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
  return result.message;
}

/** POST /api/admin/waitlist — record who exported how many rows (FR-21). */
export async function logWaitlistExport(count: number): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/admin/waitlist', {
    method: 'POST',
    body: { count },
  });
}
