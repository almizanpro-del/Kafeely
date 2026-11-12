/**
 * Password hashing — argon2id with the OWASP Password Storage Cheat Sheet
 * parameters (memory 19 MiB, iterations 2, parallelism 1). The PHC string
 * embeds salt + parameters, so parameter upgrades can be done lazily on
 * next successful login without a data migration.
 */

import { hash, verify } from '@node-rs/argon2';

const ARGON2ID_OPTIONS = {
  memoryCost: 19_456, // KiB (19 MiB)
  timeCost: 2,
  parallelism: 1,
};

/** Hashes a plaintext password into an argon2id PHC string. */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2ID_OPTIONS);
}

/**
 * Verifies a plaintext password against a stored PHC string.
 * Corrupt/foreign hashes resolve to `false` (never throws), so login always
 * fails safely and in constant time semantics.
 */
export async function verifyPassword(storedHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}
