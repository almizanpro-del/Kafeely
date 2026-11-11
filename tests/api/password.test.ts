/**
 * Password hashing tests — argon2id with OWASP parameters.
 */

import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../api/_lib/password';

describe('password hashing (argon2id)', () => {
  it('produces an argon2id PHC string with OWASP parameters', async () => {
    const hash = await hashPassword('correct horse battery 9');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).toContain('m=19456');
    expect(hash).toContain('t=2');
    expect(hash).toContain('p=1');
  });

  it('verifies the correct password', async () => {
    const hash = await hashPassword('another-good-password-42');
    expect(await verifyPassword(hash, 'another-good-password-42')).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('another-good-password-42');
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });

  it('uses a unique random salt per hash', async () => {
    const a = await hashPassword('same-password-input');
    const b = await hashPassword('same-password-input');
    expect(a).not.toBe(b);
  });

  it('fails safely on corrupt hashes (never throws)', async () => {
    expect(await verifyPassword('not-a-valid-phc-string', 'whatever')).toBe(false);
    expect(await verifyPassword('', 'whatever')).toBe(false);
  });
});
