/**
 * API request validation (zod) — the server-side twin of the client's
 * validators. The email rule delegates to the shared `isValidEmail`, so the
 * client and the API can never drift apart (code-review "validator parity",
 * extended to the backend).
 *
 * Password policy per docs/backend-migration.md §4 / NIST SP 800-63B:
 * length first (12–128), a small common-password blocklist, no composition
 * rules, no forced rotation.
 */

import { z } from 'zod';
import { isValidEmail, normalizeEmail } from '../../src/utils/validation.ts';

/** ~120 entries covering the most-guessed passwords (top of publicly known lists). */
const COMMON_PASSWORDS = new Set([
  '123456', '123456789', '12345678', '1234567890', '1234567', 'qwerty', 'qwerty123',
  'password', 'password1', 'password123', 'passw0rd', 'abc123', 'abc123456',
  '111111', '11111111', '000000', '00000000', '121212', '123123', '123321',
  '654321', '696969', '999999', 'iloveyou', 'iloveyou1', 'admin', 'admin1',
  'administrator', 'letmein', 'letmein123', 'welcome', 'welcome1', 'welcome123',
  'monkey', 'dragon', 'sunshine', 'princess', 'football', 'baseball', 'superman',
  'batman', 'trustno1', 'master', 'michael', 'jennifer', 'jordan23', 'harley',
  'ranger', 'hunter', 'buster', 'soccer', 'hockey', 'killer', 'george', 'sexy',
  'andrew', 'charlie', 'thomas', 'robert', 'access', 'access123', 'root', 'toor',
  'test', 'test123', 'guest', 'guest123', 'user', 'user123', 'default',
  'mustang', 'shadow', 'michael1', 'jessica', 'ashley', 'bailey', 'passw0rd1',
  'qazwsx', 'zaq12wsx', '1q2w3e4r', '1qaz2wsx', 'qwertyuiop', 'asdfghjkl',
  'zxcvbnm', 'asdfgh', 'qwe123', 'a123456', 'a123456789', '123qwe', 'p@ssw0rd',
  'p@ssword', 'pass123', 'pass1234', 'lovely', 'loveme', 'flower', 'hello',
  'hello123', 'freedom', 'whatever', 'zaq1zaq1', 'abcd1234', 'asdf1234',
  'kafely', 'kafeely', 'kafeely123', 'dubai', 'dubai123', 'realestate',
  'security', 'changeme', 'changeme1', 'temp123', 'temporary', 'summer2024',
  'summer2025', 'summer2026', 'winter2024', 'winter2025', 'winter2026',
]);

export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(128, 'Use at most 128 characters.')
  .refine(isNotCommonPassword, {
    message: 'This password is too common. Choose a longer or less predictable one.',
  });

/**
 * Blocklist check that also catches numbered/punctuated variants of common
 * base words: "Password123!" → "password", "dubai2024" → "dubai".
 */
function isNotCommonPassword(value: string): boolean {
  const lowered = value.toLowerCase();
  if (COMMON_PASSWORDS.has(lowered)) return false;
  const base = lowered.replace(/[0-9!@#$%^&*._-]+$/, '');
  return !COMMON_PASSWORDS.has(base);
}

export const registerSchema = z.object({
  email: z
    .string()
    .max(254, 'Email is too long.')
    .refine((value) => isValidEmail(value), 'Enter a valid email address.')
    .transform(normalizeEmail),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(80, 'Name is too long (max 80 characters).'),
  password: passwordSchema,
  /** One-time bootstrap token — makes the first account the Super-Admin. */
  bootstrapToken: z.string().max(200).optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .max(254)
    .refine((value) => isValidEmail(value), 'Enter a valid email address.')
    .transform(normalizeEmail),
  password: z.string().min(1, 'Password is required.').max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'A verification token is required.').max(200),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .max(254)
    .refine((value) => isValidEmail(value), 'Enter a valid email address.')
    .transform(normalizeEmail),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'A reset token is required.').max(200),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.').max(128),
  newPassword: passwordSchema,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password confirmation is required.').max(128),
});

/** PATCH /api/admin/team/:id — the management action to run on the account. */
export const teamActionSchema = z.object({
  action: z.enum(['approve', 'suspend', 'reactivate', 'promote', 'reset', 'delete']),
});

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .max(254)
    .refine((value) => isValidEmail(value), 'Enter a valid email address.')
    .transform(normalizeEmail),
});

const optionalText = (max: number) => z.string().trim().max(max).optional();

const consentRecordSchema = z.object({
  recordedAt: z.string().max(40).optional(),
  language: z.enum(['en', 'ar']),
  wordingWaitlistUpdates: z.string().max(2000),
  wordingMarketing: z.string().max(2000),
  wordingContact: z.string().max(2000),
});

/** POST /api/waitlist — one public waitlist/interest submission. */
export const waitlistSubmissionSchema = z.object({
  role: z.enum(['owner', 'tenant', 'partner', 'investor']),
  subRole: z.string().trim().min(1, 'Select an option.').max(80),
  email: z
    .string()
    .max(254, 'Email is too long.')
    .refine((value) => isValidEmail(value), 'Enter a valid email address.')
    .transform(normalizeEmail),
  name: optionalText(80),
  firm: optionalText(120),
  organisation: optionalText(120),
  partnerType: optionalText(80),
  investorType: optionalText(80),
  area: optionalText(120),
  unitType: optionalText(80),
  rentBand: optionalText(80),
  moveInTiming: optionalText(80),
  phone: optionalText(40),
  message: optionalText(2000),
  preferredCallTime: optionalText(80),
  marketingConsent: z.boolean().default(false),
  contactConsent: z.literal(true, { message: 'Contact consent is required.' }),
  privacyConsentVersion: z.string().trim().min(1).max(40),
  consentRecord: consentRecordSchema.optional(),
});

export const waitlistVerifySchema = z.object({
  token: z.string().min(10, 'A verification token is required.').max(200),
});

export const exportLogSchema = z.object({
  count: z.number().int().min(0).max(100_000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type TeamActionInput = z.infer<typeof teamActionSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type WaitlistSubmissionInput = z.infer<typeof waitlistSubmissionSchema>;
