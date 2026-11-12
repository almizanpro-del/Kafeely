/**
 * Post-submission confirmation panel (FR-03: the on-screen response is
 * identical whether or not the email already existed).
 */
import React from 'react';
import { Language } from '../../types';
import { content } from '../../content/translations';
import { MailCheck } from 'lucide-react';

export const SubmittedPanel: React.FC<{
  lang: Language;
  /** Address the confirmation email was sent to. */
  email: string;
  /** Server copy for the generic response. */
  message: string;
  /** Dismiss the panel and return to the form. */
  onReset: () => void;
}> = ({ lang, email, message, onReset }) => {
  const fc = content[lang].forms.common;

  return (
    <div className="py-6 text-center animate-in fade-in duration-300">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#C5A880]/15 text-[#C5A880]">
        <MailCheck className="h-7 w-7" />
      </div>
      <h4 className="mt-4 text-xl font-serif font-bold text-white">
        {lang === 'en' ? 'Check Your Inbox' : 'يرجى التحقق من بريدك'}
      </h4>
      <p className="mt-2 text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
        {lang === 'en'
          ? 'We have sent a confirmation link. Your details are saved once you open it.'
          : 'أرسلنا إليك رابط تأكيد. تُحفظ بياناتك بمجرد فتح الرابط.'}
      </p>
      <div className="mt-4 rounded-md border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400 max-w-md mx-auto">
        <span className="font-mono text-slate-200">{email}</span>
        <span aria-hidden="true" className="mx-1">·</span>
        <span className="text-[#C5A880]">
          {lang === 'en' ? 'Awaiting Email Verification' : 'في انتظار التحقق بالبريد'}
        </span>
      </div>

      <p className="mt-4 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
        {lang === 'en' ? message || fc.doubleOptInNotice : fc.doubleOptInNotice}
      </p>

      <p className="mt-2 text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
        {lang === 'en'
          ? 'The link is single-use and expires in 48 hours. If it does not arrive within a few minutes, check your spam folder.'
          : 'الرابط صالح لمرة واحدة وينتهي خلال 48 ساعة. إذا لم يصلك خلال دقائق، فتحقق من مجلد البريد غير المرغوب فيه.'}
      </p>

      <div className="mt-6 flex items-center justify-center">
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          {lang === 'en' ? 'Submit Another Entry' : 'إرسال طلب آخر'}
        </button>
      </div>
    </div>
  );
};
