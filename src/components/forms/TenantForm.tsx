/**
 * Tenant waitlist form (fields + consents + submit).
 * Presentational only — validation and submission live in AudienceForms.
 */
import React from 'react';
import { Language } from '../../types';
import { content } from '../../content/translations';
import { ConsentCheckbox, Field, SelectInput, SubmitButton, TextInput } from './fields';

export interface TenantFormData {
  role: string;
  email: string;
  area: string;
  unitType: string;
  moveInTiming: string;
  phone: string;
  marketingConsent: boolean;
  contactConsent: boolean;
}

export const TenantForm: React.FC<{
  lang: Language;
  data: TenantFormData;
  onChange: (patch: Partial<TenantFormData>) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}> = ({ lang, data, onChange, isSubmitting, onSubmit }) => {
  const t = content[lang];
  const fc = t.forms.common;
  const ft = t.forms.tenant;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Tenant Role */}
      <Field label={ft.roleLabel} required>
        <SelectInput lang={lang} value={data.role} onChange={(v) => onChange({ role: v })} options={ft.roleOptions} />
      </Field>

      {/* Email */}
      <Field label={fc.email} required>
        <TextInput type="email" value={data.email} onChange={(v) => onChange({ email: v })} placeholder={fc.emailPlaceholder} />
      </Field>

      {/* Area selection */}
      <Field label={ft.areaLabel} required>
        <SelectInput lang={lang} value={data.area} onChange={(v) => onChange({ area: v })} options={ft.areaOptions} />
      </Field>

      {/* Unit Type & Move In Timing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={ft.unitTypeLabel}>
          <SelectInput
            lang={lang}
            value={data.unitType}
            onChange={(v) => onChange({ unitType: v })}
            options={ft.unitTypeOptions}
            variant="secondary"
            placeholder={['-- Desired Typology --', '-- نوع الوحدة المرغوبة --']}
          />
        </Field>

        <Field label={ft.moveInLabel}>
          <SelectInput
            lang={lang}
            value={data.moveInTiming}
            onChange={(v) => onChange({ moveInTiming: v })}
            options={ft.moveInOptions}
            variant="secondary"
            placeholder={['-- Move-In Window --', '-- موعد الانتقال المتوقع --']}
          />
        </Field>
      </div>

      {/* Phone (Optional) */}
      <Field label={fc.phone}>
        <TextInput type="tel" value={data.phone} onChange={(v) => onChange({ phone: v })} placeholder={fc.phonePlaceholder} variant="secondary" />
      </Field>

      {/* Consents */}
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

      <SubmitButton busy={isSubmitting} busyLabel={fc.submitting} label={ft.buttonSubmit} />
    </form>
  );
};
