/**
 * Transactional email via Resend (docs/backend-migration.md §7).
 *
 * No SDK dependency — a single fetch against Resend's HTTP API keeps the
 * serverless bundle small. When RESEND_API_KEY is absent (local dev / demo),
 * the mailer falls back to logging, so flows remain testable end-to-end.
 * Tests inject a capture mailer instead of either real transport.
 *
 * Failures are surfaced to the caller (rather than swallowed) so the auth
 * service can tell the user that the verification email was not sent. The
 * request is time-boxed: a hung provider must not hold a serverless function
 * open until its own timeout.
 */

import { optionalEnv } from './env.ts';

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface Mailer {
  send(input: EmailInput): Promise<{ mode: 'resend' | 'console' }>;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 10_000;

function consoleMailer(): Mailer {
  return {
    async send(input) {
      console.log(`[mailer:console] to=${input.to} subject="${input.subject}"`);
      return { mode: 'console' };
    },
  };
}

function resendMailer(apiKey: string): Mailer {
  return {
    async send(input) {
      const from = optionalEnv('EMAIL_FROM', 'Kafeely <noreply@kafeely.com>');
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.html }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error(`[mailer:resend] ${response.status} ${body}`);
        throw new Error(`Email provider rejected the message (${response.status}).`);
      }
      return { mode: 'resend' };
    },
  };
}

/** Chooses the transport per environment. */
export function getMailer(): Mailer {
  const apiKey = optionalEnv('RESEND_API_KEY', '');
  return apiKey ? resendMailer(apiKey) : consoleMailer();
}

/** HTML-escapes untrusted text before it is interpolated into an email. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Shared HTML wrapper so every backend email is consistent and branded. */
export function emailHtml(title: string, bodyHtml: string, actionUrl?: string): string {
  const safeTitle = escapeHtml(title);
  // The URL is built from the trusted SITE_URL constant, but escape it anyway:
  // a future caller must not be able to inject attributes or close the tag.
  const button = actionUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtml(actionUrl)}" style="background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-family:sans-serif">${safeTitle}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:32px;background:#f8fafc;font-family:sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
<h2 style="margin:0 0 16px">${safeTitle}</h2>
<div style="line-height:1.6">${bodyHtml}</div>
${button}
<p style="margin-top:24px;font-size:12px;color:#64748b">Kafeely — if you did not request this email, you can safely ignore it.</p>
</div></body></html>`;
}
