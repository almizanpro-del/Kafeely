import React, { useState } from 'react';
import { Language, AudienceRole, ConsentRecord } from '../types';
import { content } from '../content/translations';
import { submitWaitlist, WaitlistSubmitInput } from '../utils/waitlist';
import { errorMessage as apiErrorMessage } from '../utils/apiClient';
import { isValidEmail } from '../utils/validation';
import { KeyRound, Building2, Briefcase, Landmark, CheckCircle2, AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { LuxuryBeamCard } from './LuxuryBeamCard';
import { OwnerForm, OwnerFormData } from './forms/OwnerForm';
import { TenantForm, TenantFormData } from './forms/TenantForm';
import { PartnerForm, PartnerFormData } from './forms/PartnerForm';
import { InvestorForm, InvestorFormData } from './forms/InvestorForm';
import { SubmittedPanel } from './forms/SubmittedPanel';

interface AudienceFormsProps {
  lang: Language;
  selectedRole: AudienceRole;
  prefillArea?: string;
  onRoleChange: (role: AudienceRole) => void;
}

const PRIVACY_CONSENT_VERSION = 'v1.1-UAE-PDPL';

/**
 * Audience portals + waitlist / interest capture forms (shell).
 *
 * Owns the per-audience form state, validation and submission; the field
 * markup lives in ./forms/* (code-review fix: "component splitting" — the
 * former monolith was ~980 lines with four near-identical inline forms).
 */
export const AudienceForms: React.FC<AudienceFormsProps> = ({
  lang,
  selectedRole,
  prefillArea,
  onRoleChange,
}) => {
  const t = content[lang];
  const fa = t.audiences;
  const fc = t.forms.common;

  // Form State for Owner
  const [ownerData, setOwnerData] = useState<OwnerFormData>({
    role: t.forms.owner.roleOptions[0],
    email: '',
    area: t.forms.owner.areaOptions[0],
    unitType: '',
    rentBand: '',
    phone: '',
    marketingConsent: false,
    contactConsent: false,
  });

  // Form State for Tenant
  const [tenantData, setTenantData] = useState<TenantFormData>({
    role: t.forms.tenant.roleOptions[0],
    email: '',
    area: t.forms.tenant.areaOptions[0],
    unitType: '',
    moveInTiming: '',
    phone: '',
    marketingConsent: false,
    contactConsent: false,
  });

  // Form State for Partner
  const [partnerData, setPartnerData] = useState<PartnerFormData>({
    organisation: '',
    role: '',
    email: '',
    partnerType: t.forms.partner.partnerTypeOptions[0],
    message: '',
    preferredCallTime: t.forms.common.preferredCallTimeOptions[0],
    contactConsent: false,
  });

  // Form State for Investor
  const [investorData, setInvestorData] = useState<InvestorFormData>({
    name: '',
    firm: '',
    email: '',
    investorType: t.forms.investor.investorTypeOptions[0],
    message: '',
    preferredCallTime: t.forms.common.preferredCallTimeOptions[0],
    contactConsent: false,
  });

  // Submission / validation status states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<{ email: string; message: string } | null>(null);

  // Area prefill (e.g. from a hero property card) — deliberately syncs form
  // state when the prefill prop or the language changes. React sanctions the
  // "adjust state when a prop changes" pattern; the setters are referenced
  // here, hence the effect must sit AFTER all four state declarations above.
  // oxlint-disable set-state-in-effect — deliberate, React-sanctioned prop-change adjustment
  React.useEffect(() => {
    if (prefillArea) {
      const ownerMatch = t.forms.owner.areaOptions.find((a) =>
        a.toLowerCase().includes(prefillArea.toLowerCase()) || prefillArea.toLowerCase().includes(a.toLowerCase())
      );
      if (ownerMatch) {
        setOwnerData((prev) => ({ ...prev, area: ownerMatch }));
      }
      const tenantMatch = t.forms.tenant.areaOptions.find((a) =>
        a.toLowerCase().includes(prefillArea.toLowerCase()) || prefillArea.toLowerCase().includes(a.toLowerCase())
      );
      if (tenantMatch) {
        setTenantData((prev) => ({ ...prev, area: tenantMatch }));
      }
    }
  }, [prefillArea, lang, t]);
  // oxlint-enable set-state-in-effect

  // PRD 4.1: record the exact consent wording shown, the language, and a
  // timestamp with every submission (storage stamps the authoritative time).
  const buildConsentRecord = (): ConsentRecord => ({
    recordedAt: new Date().toISOString(),
    language: lang,
    wordingWaitlistUpdates: fc.waitlistUpdatesConsent,
    wordingMarketing: fc.marketingConsent,
    wordingContact: fc.contactConsent,
  });

  // Shared validator — identical rules to the Super-Admin console auth
  // (code-review fix: "form validation parity", see src/utils/validation.ts).
  const validateEmail = (email: string) => isValidEmail(email);

  /**
   * Common submit epilogue: POSTs to the waitlist API and shows the same
   * confirmation whether the address is new or already on the list (FR-03 —
   * the server never reveals which, so the UI cannot either).
   */
  const finishSubmission = async (payload: WaitlistSubmitInput) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const message = await submitWaitlist(payload);
      setSubmitted({ email: payload.email, message });
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, fc.errorSubmitFailed));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Handlers
  const handleOwnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!ownerData.email || !ownerData.role || !ownerData.area) {
      setErrorMessage(fc.errorMissingField);
      return;
    }
    if (!validateEmail(ownerData.email)) {
      setErrorMessage(fc.errorInvalidEmail);
      return;
    }
    if (!ownerData.contactConsent) {
      setErrorMessage(fc.errorConsentRequired);
      return;
    }

    void finishSubmission({
      role: 'owner',
      consentRecord: buildConsentRecord(),
      subRole: ownerData.role,
      email: ownerData.email,
      area: ownerData.area,
      unitType: ownerData.unitType || undefined,
      rentBand: ownerData.rentBand || undefined,
      phone: ownerData.phone || undefined,
      marketingConsent: ownerData.marketingConsent,
      contactConsent: ownerData.contactConsent,
      privacyConsentVersion: PRIVACY_CONSENT_VERSION,
    });
  };

  const handleTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!tenantData.email || !tenantData.role || !tenantData.area) {
      setErrorMessage(fc.errorMissingField);
      return;
    }
    if (!validateEmail(tenantData.email)) {
      setErrorMessage(fc.errorInvalidEmail);
      return;
    }
    if (!tenantData.contactConsent) {
      setErrorMessage(fc.errorConsentRequired);
      return;
    }

    void finishSubmission({
      role: 'tenant',
      consentRecord: buildConsentRecord(),
      subRole: tenantData.role,
      email: tenantData.email,
      area: tenantData.area,
      unitType: tenantData.unitType || undefined,
      moveInTiming: tenantData.moveInTiming || undefined,
      phone: tenantData.phone || undefined,
      marketingConsent: tenantData.marketingConsent,
      contactConsent: tenantData.contactConsent,
      privacyConsentVersion: PRIVACY_CONSENT_VERSION,
    });
  };

  const handlePartnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!partnerData.organisation || !partnerData.role || !partnerData.email || !partnerData.partnerType) {
      setErrorMessage(fc.errorMissingField);
      return;
    }
    if (!validateEmail(partnerData.email)) {
      setErrorMessage(fc.errorInvalidEmail);
      return;
    }
    if (!partnerData.contactConsent) {
      setErrorMessage(fc.errorConsentRequired);
      return;
    }

    void finishSubmission({
      role: 'partner',
      consentRecord: buildConsentRecord(),
      subRole: partnerData.role,
      email: partnerData.email,
      organisation: partnerData.organisation,
      partnerType: partnerData.partnerType,
      message: partnerData.message || undefined,
      preferredCallTime: partnerData.preferredCallTime || undefined,
      marketingConsent: false,
      contactConsent: partnerData.contactConsent,
      privacyConsentVersion: PRIVACY_CONSENT_VERSION,
    });
  };

  const handleInvestorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!investorData.name || !investorData.firm || !investorData.email || !investorData.investorType) {
      setErrorMessage(fc.errorMissingField);
      return;
    }
    if (!validateEmail(investorData.email)) {
      setErrorMessage(fc.errorInvalidEmail);
      return;
    }
    if (!investorData.contactConsent) {
      setErrorMessage(fc.errorConsentRequired);
      return;
    }

    void finishSubmission({
      role: 'investor',
      consentRecord: buildConsentRecord(),
      subRole: investorData.investorType,
      email: investorData.email,
      name: investorData.name,
      firm: investorData.firm,
      investorType: investorData.investorType,
      message: investorData.message || undefined,
      preferredCallTime: investorData.preferredCallTime || undefined,
      marketingConsent: false,
      contactConsent: investorData.contactConsent,
      privacyConsentVersion: PRIVACY_CONSENT_VERSION,
    });
  };

  const switchAudience = (role: AudienceRole) => {
    onRoleChange(role);
    setErrorMessage(null);
    setSubmitted(null);
  };

  const currentAudienceContent = fa[selectedRole];

  const roleTabs: Array<{ role: AudienceRole; label: string; icon: React.ReactNode }> = [
    { role: 'owner', label: fa.tabs.owner, icon: <KeyRound className="h-4 w-4" /> },
    { role: 'tenant', label: fa.tabs.tenant, icon: <Building2 className="h-4 w-4" /> },
    { role: 'partner', label: fa.tabs.partner, icon: <Briefcase className="h-4 w-4" /> },
    { role: 'investor', label: fa.tabs.investor, icon: <Landmark className="h-4 w-4" /> },
  ];

  return (
    <section id="audiences" className="relative border-t border-slate-800/80 bg-[#070D1E] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C5A880]">
            {fa.eyebrow}
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white leading-tight">
            {fa.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            {fa.description}
          </p>
        </div>

        {/* Tab Controls (Refined luxury segmented buttons) */}
        <div className="mt-10 flex flex-wrap gap-2.5 border-b border-slate-800 pb-4">
          {roleTabs.map((tab) => (
            <button
              key={tab.role}
              type="button"
              onClick={() => switchAudience(tab.role)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                selectedRole === tab.role
                  ? 'bg-[#C5A880] text-[#0B132B] shadow-md ring-1 ring-[#C5A880]/30'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content & Form Split Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Audience Value Proposition & Benefits */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-serif font-bold text-white">
                {currentAudienceContent.title}
              </h3>
              <p className="mt-1 text-xs text-[#C5A880] font-medium">
                {currentAudienceContent.subtitle}
              </p>

              <div className="mt-6 flex flex-col gap-3">
                {currentAudienceContent.benefits.map((benefit: string, bIdx: number) => (
                  <div key={bIdx} className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-[#C5A880] shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              {/* What happens next note (PRD Section 4 mandate) */}
              <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
                  <Clock className="h-4 w-4 text-[#C5A880]" />
                  <span>{lang === 'en' ? 'Follow-Up Journey' : 'مسار المتابعة والإجراء'}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentAudienceContent.nextStepNote}
                </p>
              </div>

              {/* Strict Notice for Investors if selected */}
              {selectedRole === 'investor' && (
                <div className="mt-4 rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{fa.investor.strictNotice}</span>
                </div>
              )}
            </div>

            {/* Unboxed Footnote */}
            <div className="mt-8 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400">
              {lang === 'en'
                ? 'Registered records are protected under the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021). You may request data erasure at any time.'
                : 'تتم حماية السجلات المسجلة وفقاً للمرسوم بقانون اتحادي رقم (45) لسنة 2021 بشأن حماية البيانات الشخصية. يمكنك طلب حذف بياناتك في أي وقت.'}
            </div>
          </div>

          {/* Right Column: Interactive Lead Capture Form */}
          <div className="lg:col-span-7">
            <LuxuryBeamCard
              hasBorderBeam={true}
              hasLightBeam={true}
              innerClassName="p-6 sm:p-9"
            >
              {/* Submission confirmation view */}
              {submitted ? (
                <SubmittedPanel
                  lang={lang}
                  email={submitted.email}
                  message={submitted.message}
                  onReset={() => setSubmitted(null)}
                />
              ) : (
                /* Form Fields */
                <div>
                  <div className="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-lg text-white">
                        {selectedRole === 'owner' && t.forms.owner.buttonSubmit}
                        {selectedRole === 'tenant' && t.forms.tenant.buttonSubmit}
                        {selectedRole === 'partner' && t.forms.partner.buttonSubmit}
                        {selectedRole === 'investor' && t.forms.investor.buttonSubmit}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {lang === 'en' ? 'Fields marked with * are required.' : 'الحقول المميزة بـ * مطلوبة.'}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase">
                      {selectedRole}
                    </span>
                  </div>

                  {/* Error Notification */}
                  {errorMessage && (
                    <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-300">
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* 1. OWNER FORM */}
                  {selectedRole === 'owner' && (
                    <OwnerForm
                      lang={lang}
                      data={ownerData}
                      onChange={(patch) => setOwnerData((prev) => ({ ...prev, ...patch }))}
                      isSubmitting={isSubmitting}
                      onSubmit={handleOwnerSubmit}
                    />
                  )}

                  {/* 2. TENANT FORM */}
                  {selectedRole === 'tenant' && (
                    <TenantForm
                      lang={lang}
                      data={tenantData}
                      onChange={(patch) => setTenantData((prev) => ({ ...prev, ...patch }))}
                      isSubmitting={isSubmitting}
                      onSubmit={handleTenantSubmit}
                    />
                  )}

                  {/* 3. PARTNER FORM */}
                  {selectedRole === 'partner' && (
                    <PartnerForm
                      lang={lang}
                      data={partnerData}
                      onChange={(patch) => setPartnerData((prev) => ({ ...prev, ...patch }))}
                      isSubmitting={isSubmitting}
                      onSubmit={handlePartnerSubmit}
                    />
                  )}

                  {/* 4. INVESTOR FORM */}
                  {selectedRole === 'investor' && (
                    <InvestorForm
                      lang={lang}
                      data={investorData}
                      onChange={(patch) => setInvestorData((prev) => ({ ...prev, ...patch }))}
                      isSubmitting={isSubmitting}
                      onSubmit={handleInvestorSubmit}
                    />
                  )}
                </div>
              )}
            </LuxuryBeamCard>
          </div>
        </div>
      </div>
    </section>
  );
};
