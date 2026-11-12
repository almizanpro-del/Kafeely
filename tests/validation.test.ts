/**
 * Shared email validator — form validation parity tests.
 *
 * Guards the single source of truth used by BOTH the public waitlist forms
 * (AudienceForms) and the Super-Admin console auth (utils/auth.ts, AuthGate).
 */
import { describe, expect, it } from 'vitest';
import { isValidEmail, normalizeEmail } from '../src/utils/validation';

describe('isValidEmail', () => {
  const valid: string[] = [
    'owner@example.com',
    'a@b.co',
    'first.last+tag@sub.domain.ae',
    'USER@EXAMPLE.COM',
    'x_underscore-123@dubai-properties.ae',
    '  padded@example.com  ', // surrounding whitespace is trimmed
  ];

  const invalid: string[] = [
    '',
    '   ',
    'not-an-email',
    'missing-at-sign.com',
    '@no-local.com',
    'no-tld@domain',
    'no-tld@domain.',
    'double..dot@example.com',
    '.leading@example.com',
    'trailing.@example.com',
    'a b@example.com', // internal space
    'a@b@c.com', // two @ signs
    'a@-bad-label.com', // label starts with hyphen
    'a@b.c', // TLD must be at least 2 chars
    `${'a'.repeat(65)}@example.com`, // local part longer than 64 (RFC 5321)
    `a@${'b'.repeat(250)}.com`, // total length over 254 (RFC 5321)
  ];

  it.each(valid)('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(invalid)('rejects %s', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Owner@Example.COM ')).toBe('owner@example.com');
  });
});
