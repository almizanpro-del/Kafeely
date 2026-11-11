/**
 * Browser-side helpers for the waitlist UI: CSV assembly/download and the
 * cookie-consent preference. Records and audit entries now live server-side
 * (`/api/waitlist`, `/api/admin/waitlist`) — nothing about a data subject is
 * persisted in localStorage anymore.
 */
import { WaitlistEntry } from '../types';

const COOKIE_PREF_KEY = 'kafeely_cookie_consent_v1';

/**
 * Builds the RFC 4180 CSV document (pure, covered by tests/storage.test.ts).
 *
 * Every field is quoted and internal quotes are doubled. Values that begin
 * with a spreadsheet formula sigil are prefixed with an apostrophe, so an
 * exported `=HYPERLINK(...)` cannot execute when the file is opened in Excel
 * or Google Sheets (CSV injection / formula injection).
 */
export function buildCsv(entries: WaitlistEntry[]): string {
  const headers = [
    'ID',
    'Role',
    'RoleTags',
    'SubRole',
    'Email',
    'Name',
    'Organisation',
    'Firm',
    'PartnerType',
    'InvestorType',
    'Area',
    'UnitType',
    'RentBand',
    'MoveInTiming',
    'Phone',
    'Message',
    'PreferredCallTime',
    'MarketingConsent',
    'ContactConsent',
    'ConsentLanguage',
    'ConsentRecordedAt',
    'PrivacyVersion',
    'SubmittedAt',
    'VerifiedDoubleOptIn',
    'VerifiedAt',
  ];

  const escapeCsv = (val: unknown): string => {
    let str = val === undefined || val === null ? '' : String(val);
    if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = entries.map((e) => [
    escapeCsv(e.id),
    escapeCsv(e.role),
    escapeCsv((e.roleTags ?? [e.role]).join('|')),
    escapeCsv(e.subRole),
    escapeCsv(e.email),
    escapeCsv(e.name || ''),
    escapeCsv(e.organisation || ''),
    escapeCsv(e.firm || ''),
    escapeCsv(e.partnerType || ''),
    escapeCsv(e.investorType || ''),
    escapeCsv(e.area || ''),
    escapeCsv(e.unitType || ''),
    escapeCsv(e.rentBand || ''),
    escapeCsv(e.moveInTiming || ''),
    escapeCsv(e.phone || ''),
    escapeCsv(e.message || ''),
    escapeCsv(e.preferredCallTime || ''),
    escapeCsv(e.marketingConsent ? 'YES' : 'NO'),
    escapeCsv(e.contactConsent ? 'YES' : 'NO'),
    escapeCsv(e.consentRecord?.language || ''),
    escapeCsv(e.consentRecord?.recordedAt || ''),
    escapeCsv(e.privacyConsentVersion),
    escapeCsv(e.submittedAt),
    escapeCsv(e.verified ? 'VERIFIED' : 'PENDING'),
    escapeCsv(e.verifiedAt || ''),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/** Exports entries as an RFC 4180 compliant CSV download. */
export function exportEntriesAsCsv(entries: WaitlistEntry[]) {
  const csvContent = buildCsv(entries);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `kafeely_dubai_waitlist_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getStoredCookieConsent(): boolean | null {
  try {
    const raw = localStorage.getItem(COOKIE_PREF_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredCookieConsent(accepted: boolean) {
  try {
    localStorage.setItem(COOKIE_PREF_KEY, JSON.stringify(accepted));
  } catch (err) {
    console.error('Failed to save cookie consent:', err);
  }
}
