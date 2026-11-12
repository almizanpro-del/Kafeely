/**
 * Owner waitlist form (fields + consents + submit).
 * Presentational only — validation and submission live in AudienceForms.
 */
import React from 'react';
import { Language } from '../../types';
import { content } from '../../content/translations';
import { ConsentCheckbox, Field, SelectInput, SubmitButton, TextInput } from './fields';

export interface OwnerFormData {
  role: string;
  email: string;
  area: string;
  unitType: string;
  rentBand: string;
  phone: string;
  marketingConsent: boolean;
  contactConsent: boolean;
}

export const OwnerForm: React.FC<{
  lang: Language;
  data: OwnerFormData;
  onChange: (patch: Partial<OwnerFormData>) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}> = ({ lang, data, onChange, isSubmitting, onSubmit }) => {
  const t = content[lang];
  const fc = t.forms.common;
  const fo = t.forms.owner;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Role selection */}
      <Field label={fo.roleLabel} required>
        <SelectInput lang={lang} value={data.role} onChange={(v) => onChange({ role: v })} options={fo.roleOptions} />
      </Field>

      {/* Email */}
      <Field label={fc.email} required>
        <TextInput type="email" value={data.email} onChange={(v) => onChange({ email: v })} placeholder={fc.emailPlaceholder} />
      </Field>

      {/* Area selection */}
      <Field label={fo.areaLabel} required>
        <SelectInput lang={lang} value={data.area} onChange={(v) => onChange({ area: v })} options={fo.areaOptions} />
      </Field>

      {/* Unit Type & Rent Band (Optional) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={fo.unitTypeLabel}>
          <SelectInput
            lang={lang}
            value={data.unitType}
            onChange={(v) => onChange({ unitType: v })}
            options={fo.unitTypeOptions}
            variant="secondary"
            placeholder={['-- Select Unit Type --', '-- اختر نوع الوحدة --']}
          />
        </Field>

        <Field label={fo.rentBandLabel}>
          <SelectInput
            lang={lang}
            value={data.rentBand}
            onChange={(v) => onChange({ rentBand: v })}
            options={fo.rentBandOptions}
            variant="secondary"
            placeholder={['-- Select Rent Band --', '-- اختر نطاق الإيجار --']}
          />
        </Field>
      </div>

      {/* Phone (Optional) */}
      <Field label={fc.phone}>
        <TextInput type="tel" value={data.phone} onChange={(v) => onChange({ phone: v })} placeholder={fc.phonePlaceholder} variant="secondary" />
      </Field>

      {/* Separate Marketing Consent (PRD Section 4 mandate) */}
      <div className="pt-2 space-y-2 border-t border-slate-800">
        <ConsentCheckbox
          checked={data.marketingConsent}
          onChange={(v) => onChange({ marketingConsent: v })}
          label={fc.marketingConsent}
        />
        <ConsentCheckbox
          checked={data.contactConsent}
          onChange={(v) => onChange({ contactConsent: v })}
          label={fc.waitlistUpdatesConsent}
          required
        />
      </div>

      <SubmitButton busy={isSubmitting} busyLabel={fc.submitting} label={fo.buttonSubmit} />
    </form>
  );
};
