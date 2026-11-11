export type Language = 'en' | 'ar';

export type AudienceRole = 'owner' | 'tenant' | 'partner' | 'investor';

/**
 * Consent metadata recorded per PRD 4.1: the timestamp, the wording shown,
 * the language, and the privacy-notice version (version lives on the entry
 * as privacyConsentVersion).
 */
export interface ConsentRecord {
  recordedAt: string;
  language: Language;
  wordingWaitlistUpdates: string;
  wordingMarketing: string;
  wordingContact: string;
}

/**
 * The payload submitted by any form (owner / tenant / partner / investor).
 * Server/admin-managed fields are excluded.
 */
export type WaitlistSubmission = Omit<
  WaitlistEntry,
  'id' | 'submittedAt' | 'verified' | 'verifiedAt' | 'verificationToken' | 'roleTags' | 'pendingUpdate'
>;

export interface WaitlistEntry {
  id: string;
  role: AudienceRole;
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
  submittedAt: string;
  verified: boolean;
  verifiedAt?: string;
  /**
   * Legacy browser-era field. The server now stores only a hashed token and
   * never returns it, so `WaitlistEntry` views never carry a raw token.
   */
  verificationToken?: string;
  /** FR-02: one person is one record; every role held by this person. */
  roleTags?: AudienceRole[];
  /** Consent metadata (PRD 4.1). */
  consentRecord?: ConsentRecord;
  /** FR-03: a duplicate submission is staged here and applied only after re-confirmation. */
  pendingUpdate?: {
    data: WaitlistSubmission;
    receivedAt: string;
  };
}

export interface AuditLog {
  id: string;
  action:
    | 'CREATE'
    | 'DOUBLE_OPT_IN_VERIFY'
    | 'DELETE_REQUESTED'
    | 'UPDATE_STAGED'
    | 'UPDATE_APPLIED'
    | 'EXPORT_CSV'
    | 'ADMIN_REGISTER'
    | 'ADMIN_EMAIL_VERIFIED'
    | 'ADMIN_LOGIN_SUCCESS'
    | 'ADMIN_LOGIN_FAILED'
    | 'ADMIN_LOCKOUT'
    | 'ADMIN_LOGOUT'
    | 'ADMIN_ACCOUNT_APPROVED'
    | 'ADMIN_ACCOUNT_SUSPENDED'
    | 'ADMIN_ACCOUNT_PROMOTED'
    | 'ADMIN_ACCOUNT_REACTIVATED'
    | 'ADMIN_ACCOUNT_DELETED'
    | 'ADMIN_EMAIL_VERIFICATION_RESENT'
    | 'ADMIN_PASSWORD_RESET_REQUEST'
    | 'ADMIN_PASSWORD_CHANGED'
    | 'ADMIN_PASSWORD_RESET_SELF'
    | 'ADMIN_PASSWORD_RESET_BY_ADMIN';
  /** Optional by design: deletion logs carry no personal data (FR-24). */
  targetId?: string;
  targetEmail?: string;
  /** Audience role on waitlist entries; console role on ADMIN_* entries. */
  role?: AudienceRole | AdminRole;
  performedBy: string;
  timestamp: string;
  details: string;
}

/** Role inside the hidden Super-Admin console (not the public audience role). */
export type AdminRole = 'super_admin' | 'staff';

export type AdminStatus = 'pending' | 'active' | 'suspended';

/**
 * Public (hash-free) view of a console account, safe to render in the Team tab.
 * Secrets (salt, password hash, recovery-code hash) never leave utils/auth.ts.
 */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  createdAt: string;
  lastLoginAt?: string;
}

/** Per-tab, in-memory session (sessionStorage). Expires after 8 hours. */
export interface AdminSession {
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
  issuedAt: number;
  expiresAt: number;
}

export interface MarketMetric {
  id: string;
  figure: string;
  metricEn: string;
  metricAr: string;
  sourceEn: string;
  sourceAr: string;
  date: string;
  noteEn: string;
  noteAr: string;
}
