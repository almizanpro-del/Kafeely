import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { content } from '../content/translations';
import { getStoredCookieConsent, setStoredCookieConsent } from '../utils/storage';
import { Cookie } from 'lucide-react';

interface CookieBannerProps {
  lang: Language;
  onOpenPrivacy: () => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ lang, onOpenPrivacy }) => {
  const [visible, setVisible] = useState(false);
  const t = content[lang].cookie;

  useEffect(() => {
    const consent = getStoredCookieConsent();
    if (consent === null) {
      // Delay showing banner slightly to avoid intrusive immediate popups
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const handleAcceptAll = () => {
    setStoredCookieConsent(true);
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    setStoredCookieConsent(false);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-4 sm:p-6 pointer-events-none">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-700/80 bg-[#0E1B38]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md pointer-events-auto text-start">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 max-w-2xl">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C5A880]/20 text-[#C5A880]">
              <Cookie className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm text-white">
                {t.title}
              </h4>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                {t.desc}
              </p>
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="mt-1 text-[11px] text-[#C5A880] underline hover:text-[#E8D7B8]"
              >
                {t.learnMore}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="rounded-md border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {t.essentialOnly}
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="rounded-md bg-[#C5A880] px-4 py-2 text-xs font-semibold text-[#0B132B] hover:bg-[#D5BD97] transition-colors"
            >
              {t.acceptAll}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
