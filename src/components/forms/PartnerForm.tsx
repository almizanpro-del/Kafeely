/**
 * Partner interest form (fields + consent + submit).
 * Presentational only — validation and submission live in AudienceForms.
 */
import React from 'react';
import { Language } from '../../types';
import { content } from '../../content/translations';
import { ConsentCheckbox, Field, SelectInput, SubmitButton, TextareaInput, TextInput } from './fields';

export interface PartnerFormData {
  organisation: string;
  role: string;
  email: string;
  partnerType: string;
  message: string;
  preferredCallTime: string;
  contactConsent: boolean;
}

export const PartnerForm: React.FC<{
  lang: Language;
  data: PartnerFormData;
  onChange: (patch: Partial<PartnerFormData>) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}> = ({ lang, data, onChange, isSubmitting, onSubmit }) => {
  const t = content[lang];
  const fc = t.forms.common;
  const fp = t.forms.partner;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Organisation & Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={fp.orgLabel} required>
          <TextInput
            type="text"
            value={data.organisation}
            onChange={(v) => onChange({ organisation: v })}
            placeholder={fp.orgPlaceholder}
          />
        </Field>

        <Field label={fp.roleLabel} required>
          <TextInput
            type="text"
            value={data.role}
            onChange={(v) => onChange({ role: v })}
            placeholder={fp.rolePlaceholder}
          />
        </Field>
      </div>

      {/* Partner Category */}
      <Field label={fp.partnerTypeLabel} required>
        <SelectInput
          lang={lang}
          value={data.partnerType}
          onChange={(v) => onChange({ partnerType: v })}
          options={fp.partnerTypeOptions}
        />
      </Field>

      {/* Email */}
      <Field label={fc.email} required>
        <TextInput type="email" value={data.email} onChange={(v) => onChange({ email: v })} placeholder={fc.emailPlaceholder} />
      </Field>

      {/* Preferred Call Window */}
      <Field label={fc.preferredCallTime}>
        <SelectInput
          lang={lang}
          value={data.preferredCallTime}
          onChange={(v) => onChange({ preferredCallTime: v })}
          options={fc.preferredCallTimeOptions}
          variant="secondary"
        />
      </Field>

      {/* Message */}
      <Field label={fc.message}>
        <TextareaInput
          value={data.message}
          onChange={(v) => onChange({ message: v })}
          placeholder={fc.messagePlaceholder}
        />
      </Field>

      {/* Consent */}
      <div className="pt-2 border-t border-slate-800">
        <ConsentCheckbox
          checked={data.contactConsent}
          onChange={(v) => onChange({ contactConsent: v })}
          label={fc.contactConsent}
          required
        />
      </div>

      <SubmitButton busy={isSubmitting} busyLabel={fc.submitting} label={fp.buttonSubmit} />
    </form>
  );
};
