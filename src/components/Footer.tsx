import React from 'react';
import { Language } from '../types';
import { content } from '../content/translations';
import { ShieldCheck } from 'lucide-react';

/** Hoisted out of the component: reading the clock during render is impure. */
const CURRENT_YEAR = new Date().getFullYear();

interface FooterProps {
  lang: Language;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  lang,
  onOpenPrivacy,
  onOpenTerms,
}) => {
  const t = content[lang].footer;
  const brand = content[lang].brand;

  return (
    <footer className="border-t border-slate-800 bg-[#060B1A] py-14 text-sm text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
          {/* Brand */}
          <div className="flex flex-col items-start gap-2.5">
            <img
              src="/assets/kafeely-logo.png"
              alt="الكفيل - Kafeely | safe home rental"
              loading="lazy"
              decoding="async"
              className="h-11 sm:h-13 w-auto object-contain"
            />
            <p className="text-slate-300 text-sm font-medium">
              {brand.descriptor} · {brand.statusNotice}
            </p>
          </div>

          {/* Nav mirror & Legal Links */}
          <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-200">
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="hover:text-[#C5A880] transition-colors underline-offset-4 hover:underline"
            >
              {t.privacy}
            </button>
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-[#C5A880] transition-colors underline-offset-4 hover:underline"
            >
              {t.terms}
            </button>
          </div>
        </div>

        {/* Regulatory Disclaimer Bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm text-slate-300">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-[#C5A880] shrink-0" />
            <span>{t.complianceNote}</span>
          </div>

          <div className="text-slate-400">
            © {CURRENT_YEAR} {t.rights}
          </div>
        </div>
      </div>
    </footer>
  );
};
