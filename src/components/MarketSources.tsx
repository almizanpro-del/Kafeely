import React from 'react';
import { Language } from '../types';
import { content } from '../content/translations';
import { LuxuryBeamCard } from './LuxuryBeamCard';
import { BookOpen, ShieldAlert, FileText, CheckCircle2, ExternalLink } from 'lucide-react';

interface MarketSourcesProps {
  lang: Language;
}

export const MarketSources: React.FC<MarketSourcesProps> = ({ lang }) => {
  const t = content[lang].sources;

  return (
    <section id="market-data" className="relative border-t border-slate-800/80 bg-[#070D1E] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C5A880]">
            {lang === 'en' ? 'Evidence-Based Framework' : 'إطار البيانات الموثقة والمصادر'}
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white leading-tight">
            {t.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        {/* Regulatory Governance & Pre-Launch Disclaimer Box with Traveling Border Line & Light Beam */}
        <div id="compliance" className="mt-10">
          <LuxuryBeamCard
            hasBorderBeam={true}
            hasLightBeam={true}
            innerClassName="p-6 sm:p-8"
          >
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-[#C5A880] border border-[#C5A880]/30">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-serif font-bold text-[#E8D7B8]">
                  {t.disclaimerTitle}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                  {t.disclaimerText}
                </p>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#C5A880] shrink-0" />
                    <span>
                      {lang === 'en'
                        ? 'UAE PDPL (Federal Decree-Law No. 45/2021) compliant'
                        : 'متوافق مع مرسوم بقانون اتحادي رقم (45) لسنة 2021 لحماية البيانات الشخصية'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#C5A880] shrink-0" />
                    <span>
                      {lang === 'en'
                        ? 'No public marketing of securities or financial returns'
                        : 'لا يتم تسويق أي أوراق مالية أو تقديم وعود بعوائد مالية للعامة'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </LuxuryBeamCard>
        </div>

        {/* Sourced Reference Table */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-[#C5A880]">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{t.sourcesTitle}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {t.list.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-[#0B132B]/85 p-5 hover:border-[#C5A880]/50 transition-all shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-serif font-semibold text-white text-base sm:text-lg">
                    {item.name}
                  </div>
                  <span className="text-xs font-bold text-[#C5A880] shrink-0 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                    {item.date}
                  </span>
                </div>
                <div className="mt-1.5 text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                  <FileText className="h-3.5 w-3.5 text-[#C5A880] shrink-0" />
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-[#C5A880] hover:underline underline-offset-2 transition-colors"
                    >
                      <span>{item.source}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
                    </a>
                  ) : (
                    <span>{item.source}</span>
                  )}
                </div>
                <div className="mt-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-2.5 leading-relaxed font-sans">
                  {item.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
