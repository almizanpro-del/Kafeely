import React from 'react';

// Static bilingual 404 view. The hosting layer (vercel.json + public/404.html)
// already returns a real HTTP 404 for unknown paths; this component is a
// client-side safety net for any environment that serves index.html for all
// paths (single-page app — a non-root path has no meaning here). It
// deliberately does NOT hint at the hidden admin console.
export const NotFoundPage: React.FC = () => (
  <div
    dir="ltr"
    className="flex min-h-screen flex-col items-center justify-center bg-[#070D1E] px-6 text-center text-slate-100"
  >
    <div className="mb-7 flex items-baseline gap-3 text-[#C5A880]">
      <span className="font-arabic text-[15px] font-semibold tracking-wide">الكفيل</span>
      <span className="font-serif text-[22px] font-semibold uppercase tracking-[0.14em]">Kafeely</span>
    </div>
    <div className="font-serif text-8xl font-semibold leading-none text-[#C5A880] md:text-[140px]">404</div>
    <h1 className="font-serif mt-2 text-2xl font-semibold text-slate-50 md:text-3xl">Page not found</h1>
    <p className="font-arabic mt-1 text-lg font-semibold text-slate-50" dir="rtl">
      الصفحة غير موجودة
    </p>
    <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">
      The page you are looking for does not exist on this site. Please check the link, or return to the homepage.
    </p>
    <p className="font-arabic mt-2 max-w-sm text-sm leading-relaxed text-slate-400" dir="rtl">
      الصفحة المطلوبة غير موجودة على هذا الموقع. يرجى التحقق من الرابط أو العودة إلى الصفحة الرئيسية.
    </p>
    <a
      href="/"
      className="mt-8 rounded-[10px] bg-[#C5A880] px-9 py-3 text-sm font-semibold text-[#070D1E] transition-opacity hover:opacity-90"
    >
      Back to homepage
    </a>
    <footer className="mt-12 text-[11px] text-slate-500">
      © 2026 Kafeely · Dubai Premium Rental Protection Platform
    </footer>
  </div>
);
