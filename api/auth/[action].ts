/**
 * /api/auth/[action] — consolidated auth router (one Vercel Function).
 *
 * The Hobby plan caps a deployment at 12 Serverless Functions, so the auth
 * endpoints live in a single dynamic handler and dispatch on the `action`
 * query segment. The public URLs are unchanged:
 *
 *   POST   /api/auth/register           POST /api/auth/forgot-password
 *   POST   /api/auth/verify-email       POST /api/auth/reset-password
 *   POST   /api/auth/login              POST /api/auth/change-password
 *   POST   /api/auth/logout             DELETE /api/auth/delete-account
 *   GET    /api/auth/me                 GET  /api/auth/bootstrap-status
 *
 * Each action runs the exact validation/origin/service stack that the
 * former per-file handlers used (moved verbatim); the outer toHandler
 * provides the uniform error mapping.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { users } from '../../db/schema.ts';
import { getDb } from '../_lib/db.ts';
import { HttpError } from '../_lib/env.ts';
import {
  buildClearedSessionCookie,
  buildSessionCookie,
  readSessionCookie,
} from '../_lib/cookies.ts';
import {
  assertMethod,
  assertSameOrigin,
  clientIp,
  readJsonBody,
  toHandler,
  userAgent,
} from '../_lib/http.ts';
import { getMailer } from '../_lib/mailer.ts';
import {
  changePassword,
  deleteAccount,
  forgotPassword,
  login,
  logout,
  me,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '../_lib/services/auth.ts';
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../_lib/validation.ts';

type ActionHandler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

/* --------------------------------- register --------------------------------- */

const registerHandler: ActionHandler = async (req, res) => {
  assertMethod(req, 'POST');
  assertSameOrigin(req);
  const input = registerSchema.parse(await readJsonBody(req));

  const result = await register(getDb(), input, {
    ip: clientIp(req),
    userAgent: userAgent(req),
    mailer: getMailer(),
  });

  res.status(result.bootstrap ? 201 : 202).json(result);
};

/* ------------------------------- verify-email ------------------------------- */

const verifyEmailHandler: ActionHandler = async (req, res) => {
  // POST only: a GET link that changes state can be triggered by link
  // scanners and prefetchers, burning the single-use token before the user
  // clicks. The email links to the console, which POSTs the token.
  assertMethod(req, 'POST');
  assertSameOrigin(req);
  const input = verifyEmailSchema.parse(await readJsonBody(req));
  const result = await verifyEmail(getDb(), input.token);
  res.status(200).json(result);
};

/* ----------------------------- resend-verification ----------------------------- */

const resendVerificationHandler: ActionHandler = async (req, res) => {
  assertMethod(req, 'POST');
  assertSameOrigin(req);
  const input = resendVerificationSchema.parse(await readJsonBody(req));

  const result = await resendVerification(getDb(), input, {
    ip: clientIp(req),
    mailer: getMailer(),
  });

  res.status(200).json(result);
};

/* ---------------------------------- login ----------------------------------- */

const loginHandler: ActionHandler = async (req, res) => {
  assertMethod(req, 'POST');
  assertSameOrigin(req);
  const input = loginSchema.parse(await readJsonBody(req));

  const result = await login(getDb(), input, {
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  res.setHeader('Set-Cookie', buildSessionCookie(result.sessionToken));
  res.status(200).json({
    user: result.user,
    expiresAt: result.expiresAt.toISOString(),
  });
};

/* ---------------------------------- logout ---------------------------------- */

const logoutHandler: ActionHandler = async (req, res) => {
  assertMethod(req, 'POST');
  const result = await logout(getDb(), readSessionCookie(req));
  res.setHeader('Set-Cookie', buildClearedSessionCookie());
  res.status(200).json(result);
};

/* ------------------------------------ me ------------------------------------ */

const meHandler: ActionHandler = async (req, res) => {
  assertMethod(req, 'GET');
  const result = await me(getDb(), readSessionCookie(req));
  res.status(200).json({
    user: result.user,
    expiresAt: result.expiresAt.toISOString(),
  });
};

/* ------------------------------ forgot-password ----------------------------- */

const forgotPasswordHandler: ActionHandler = async (req, res) => {
  assertMethod(req, 'POST');
  assertSameOrigin(req);
  const input = forgotPasswordSchema.parse(await readJsonBody(req));

  const result = await forgotPassword(getDb(), input, {
    ip: clientIp(req),
    mailer: getMailer(),
  });

  res.status(200).json(result);
};

/* ------------------------------ reset-password ------------------------------ */

const resetPasswordHandler: ActionHandler = async (req, res) => {
  assertMethod(req, 'POST');
  assertSameOrigin(req);
  const input = resetPasswordSchema.parse(await readJsonBody(req));

  const result = await resetPassword(getDb(), input);
  res.setHeader('Set-Cookie', buildClearedSessionCookie());
  res.status(200).json(result);
};

/* ------------------------------ change-password ----------------------------- */

const changePasswordHandler: ActionHandler = async (req, res) => {
  assertMethod(req, 'POST');
  assertSameOrigin(req);
  const input = changePasswordSchema.parse(await readJsonBody(req));

  const result = await changePassword(getDb(), readSessionCookie(req), input);
  res.status(200).json(result);
};

/* ------------------------------ delete-account ------------------------------ */

const deleteAccountHandler: ActionHandler = async (req, res) => {
  assertMethod(req, 'DELETE');
  assertSameOrigin(req);
  const input = deleteAccountSchema.parse(await readJsonBody(req));

  const result = await deleteAccount(getDb(), readSessionCookie(req), input);
  res.setHeader('Set-Cookie', buildClearedSessionCookie());
  res.status(200).json(result);
};

/* ----------------------------- bootstrap-status ----------------------------- */

const bootstrapStatusHandler: ActionHandler = async (req, res) => {
  assertMethod(req, 'GET');
  const db = getDb();
  const rows = await db.select({ id: users.id }).from(users).limit(1);
  res.status(200).json({ hasUsers: rows.length > 0 });
};

/* --------------------------------- dispatch --------------------------------- */

const handlers: Record<string, ActionHandler> = {
  register: registerHandler,
  'verify-email': verifyEmailHandler,
  'resend-verification': resendVerificationHandler,
  login: loginHandler,
  logout: logoutHandler,
  me: meHandler,
  'forgot-password': forgotPasswordHandler,
  'reset-password': resetPasswordHandler,
  'change-password': changePasswordHandler,
  'delete-account': deleteAccountHandler,
  'bootstrap-status': bootstrapStatusHandler,
};

const handler = toHandler(async (req, res) => {
  const action = String(req.query.action ?? '').toLowerCase();
  const actionHandler = handlers[action];
  if (!actionHandler) {
    throw new HttpError(404, 'unknown_action', 'Unknown auth action.');
  }
  await actionHandler(req, res);
});

export default handler;
