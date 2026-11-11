/**
 * Unit tests for src/utils/storage.ts — CSV escaping (RFC 4180), CSV
 * formula-injection defence and the cookie-consent preference. Records and
 * audit entries now live server-side, so there is nothing else to test here.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { WaitlistEntry } from '../src/types';
import { buildCsv, getStoredCookieConsent, setStoredCookieConsent } from '../src/utils/storage';

beforeEach(() => {
  localStorage.clear();
});

/* ---------------- CSV export (RFC 4180) ---------------- */

function makeEntry(overrides: Partial<WaitlistEntry> = {}): WaitlistEntry {
  return {
    id: 'entry_1',
    role: 'owner',
    subRole: 'Single Owner',
    email: 'owner@example.com',
    marketingConsent: true,
    contactConsent: true,
    privacyConsentVersion: 'v1.1-UAE-PDPL',
    submittedAt: '2026-01-01T00:00:00.000Z',
    verified: false,
    ...overrides,
  };
}

describe('buildCsv', () => {
  it('emits the exact header row', () => {
    const header = buildCsv([]).split('\r\n')[0];
    expect(header).toBe(
      'ID,Role,RoleTags,SubRole,Email,Name,Organisation,Firm,PartnerType,InvestorType,Area,UnitType,RentBand,MoveInTiming,Phone,Message,PreferredCallTime,MarketingConsent,ContactConsent,ConsentLanguage,ConsentRecordedAt,PrivacyVersion,SubmittedAt,VerifiedDoubleOptIn,VerifiedAt'
    );
  });

  it('uses CRLF line endings and one row per entry', () => {
    const csv = buildCsv([makeEntry(), makeEntry({ id: 'entry_2', email: 'two@example.com' })]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    expect(csv).not.toMatch(/[^\r]\n/);
  });

  it('doubles internal quotes and always quotes fields', () => {
    const csv = buildCsv([makeEntry({ name: 'Al "The Owner" Said' })]);
    expect(csv).toContain('"Al ""The Owner"" Said"');
  });

  it('keeps commas and newlines inside a single quoted field', () => {
    const csv = buildCsv([makeEntry({ message: 'line1\nline2, with comma' })]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2); // header + 1 record
    expect(csv).toContain('"line1\nline2, with comma"');
  });

  it('renders consent booleans and verification status as YES/NO and VERIFIED/PENDING', () => {
    const csv = buildCsv([
      makeEntry({ marketingConsent: true, contactConsent: true, verified: true, verifiedAt: '2026-01-02T00:00:00.000Z' }),
    ]);
    expect(csv).toContain('"YES"');
    expect(csv).toContain('"VERIFIED"');
    const csv2 = buildCsv([makeEntry({ marketingConsent: false, contactConsent: false, verified: false })]);
    expect(csv2).toContain('"NO"');
    expect(csv2).toContain('"PENDING"');
  });

  it('joins role tags with a pipe and fills optional fields as empty', () => {
    const csv = buildCsv([makeEntry({ roleTags: ['owner', 'investor'], role: 'owner' })]);
    expect(csv).toContain('"owner|investor"');
    expect(csv).toContain('""'); // empty optional fields
  });

  it('neutralises CSV formula injection in user-controlled fields', () => {
    const csv = buildCsv([
      makeEntry({
        name: '=HYPERLINK("https://evil.example","click")',
        message: '@SUM(1+1)',
        email: '+123@example.com',
      }),
    ]);
    // Each dangerous value is prefixed with an apostrophe inside the quotes,
    // so spreadsheets treat it as text rather than executing it.
    expect(csv).toContain('"\'=HYPERLINK(""https://evil.example"",""click"")"');
    expect(csv).toContain('"\'@SUM(1+1)"');
    expect(csv).toContain('"\'+123@example.com"');
  });
});

/* ---------------- Cookie consent ---------------- */

describe('cookie consent preference', () => {
  it('round-trips the stored choice and defaults to null', () => {
    expect(getStoredCookieConsent()).toBeNull();
    setStoredCookieConsent(true);
    expect(getStoredCookieConsent()).toBe(true);
    setStoredCookieConsent(false);
    expect(getStoredCookieConsent()).toBe(false);
  });
});
