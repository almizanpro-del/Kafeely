/**
 * Shared, prop-driven form primitives for the four audience capture forms.
 *
 * Extracted from the former ~980-line AudienceForms monolith (code-review
 * fix: "component splitting"). Every field previously repeated the same
 * Tailwind class strings; they now live here exactly once.
 *
 * Variants:
 *  - "primary"   → required fields (brighter surface + focus ring)
 *  - "secondary" → optional fields (dimmer surface)
 */
import React from 'react';
import { Language } from '../../types';

export type FieldVariant = 'primary' | 'secondary';

export const inputClass = (variant: FieldVariant): string =>
  variant === 'primary'
    ? 'w-full rounded-md border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 focus:border-[#C5A880] focus:outline-none focus:ring-1 focus:ring-[#C5A880]'
    : 'w-full rounded-md border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 focus:border-[#C5A880] focus:outline-none';

export const Field: React.FC<{
  label: string;
  /** Adds the gold asterisk and the brighter label tone. */
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, required, children }) => (
  <div>
    <label
      className={`block text-xs font-medium mb-1.5 ${
        required ? 'text-slate-300' : 'text-slate-400'
      }`}
    >
      {label} {required && <span className="text-[#C5A880]">*</span>}
    </label>
    {children}
  </div>
);

export const TextInput: React.FC<{
  type?: 'text' | 'email' | 'tel';
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  variant?: FieldVariant;
}> = ({ type = 'text', value, onChange, placeholder, variant = 'primary' }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={inputClass(variant)}
  />
);

export const SelectInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  variant?: FieldVariant;
  /** Bilingual "no selection" row shown first when provided. */
  placeholder?: [en: string, ar: string];
  lang: Language;
}> = ({ value, onChange, options, variant = 'primary', placeholder, lang }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={inputClass(variant)}
  >
    {placeholder && <option value="">{lang === 'en' ? placeholder[0] : placeholder[1]}</option>}
    {options.map((opt) => (
      <option key={opt} value={opt}>{opt}</option>
    ))}
  </select>
);

export const TextareaInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}> = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea
    rows={rows}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={inputClass('secondary')}
  />
);

export const ConsentCheckbox: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  required?: boolean;
}> = ({ checked, onChange, label, required }) => (
  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-400">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      required={required}
      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-[#C5A880] focus:ring-[#C5A880]"
    />
    <span>
      {label} {required && <span className="text-[#C5A880]">*</span>}
    </span>
  </label>
);

export const SubmitButton: React.FC<{
  busy: boolean;
  busyLabel: string;
  label: string;
}> = ({ busy, busyLabel, label }) => (
  <button
    type="submit"
    disabled={busy}
    className="w-full mt-4 rounded-md bg-[#C5A880] py-3 text-xs sm:text-sm font-semibold text-[#0B132B] shadow-sm hover:bg-[#D5BD97] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880]"
  >
    {busy ? busyLabel : label}
  </button>
);
