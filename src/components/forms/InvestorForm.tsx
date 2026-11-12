/**
 * Investor interest form (fields + consent + submit).
 * Presentational only — validation and submission live in AudienceForms.
 */
import React from 'react';
import { Language } from '../../types';
import { content } from '../../content/translations';
import { ConsentCheckbox, Field, SelectInput, SubmitButton, TextareaInput, TextInput } from './fields';

export interface InvestorFormData {
  name: string;
  firm: string;
  email: string;
  investorType: string;
  message: string;
  preferredCallTime: string;
  contactConsent: boolean;
}

export const InvestorForm: React.FC<{
  lang: Language;
  data: InvestorFormData;
  onChange: (patch: Partial<InvestorFormData>) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}> = ({ lang, data, onChange, isSubmitting, onSubmit }) => {
  const t = content[lang];
  const fc = t.forms.common;
  const fi = t.forms.investor;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Name & Firm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={fi.nameLabel} required>
          <TextInput
            type="text"
            value={data.name}
            onChange={(v) => onChange({ name: v })}
            placeholder={fi.namePlaceholder}
          />
        </Field>

        <Field label={fi.firmLabel} required>
          <TextInput
            type="text"
            value={data.firm}
            onChange={(v) => onChange({ firm: v })}
            placeholder={fi.firmPlaceholder}
          />
        </Field>
      </div>

      {/* Investor Classification */}
      <Field label={fi.investorTypeLabel} required>
        <SelectInput
          lang={lang}
          value={data.investorType}
          onChange={(v) => onChange({ investorType: v })}
          options={fi.investorTypeOptions}
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

      {/* Consent & Strict Note */}
      <div className="pt-2 border-t border-slate-800 space-y-2">
        <ConsentCheckbox
          checked={data.contactConsent}
          onChange={(v) => onChange({ contactConsent: v })}
          label={fc.contactConsent}
          required
        />
      </div>

      <SubmitButton busy={isSubmitting} busyLabel={fc.submitting} label={fi.buttonSubmit} />
    </form>
  );
};
