import React from 'react';
import { Language } from '../types';
import { content } from '../content/translations';
import { LuxuryBeamCard } from './LuxuryBeamCard';
import { AlertCircle, FileSpreadsheet, Hourglass } from 'lucide-react';

interface ProblemSectionProps {
  lang: Language;
}

export const ProblemSection: React.FC<ProblemSectionProps> = ({ lang }) => {
  const t = content[lang].problem;

  // Icons in cohesive luxury line style
  const icons = [AlertCircle, FileSpreadsheet, Hourglass];

  return (
    <section className="relative border-t border-slate-800/80 bg-[#0A1024]/60 pt-20 pb-10 lg:pt-28 lg:pb-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#C5A880]">
            {t.eyebrow}
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white leading-tight">
            {t.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            {t.description}
          </p>
        </div>

        {/* 3 Problem Points Cards with Traveling Border Line & Interior Light Beam */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {t.points.map((point, index) => {
            const IconComponent = icons[index];
            return (
              <LuxuryBeamCard
                key={point.num}
                hasBorderBeam={true}
                hasLightBeam={true}
                innerClassName="p-6 sm:p-7 flex flex-col justify-between"
              >
                <div>
                  {/* Header with human editorial numbering and cohesive icon */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/90 text-[#C5A880] group-hover:border-[#C5A880]/60 transition-colors">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-xs font-bold text-[#E8D7B8]">
                      {point.num}
                    </span>
                  </div>

                  {/* Title & Description (Refined luxury editorial proportions) */}
                  <h3 className="mt-4 text-base sm:text-lg font-serif font-semibold text-white group-hover:text-[#E8D7B8] transition-colors">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {point.desc}
                  </p>
                </div>
              </LuxuryBeamCard>
            );
          })}
        </div>

        {/* Informative Context Bar (Refined luxury sizing) */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-[#0B132B]/90 p-4 text-xs sm:text-sm text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mini infographic: 65% share ring (decorative; figure from the sourced context statement) */}
            <svg viewBox="0 0 36 36" className="h-10 w-10 shrink-0" aria-hidden="true">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1E2C4F" strokeWidth="4" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#C5A880"
                strokeWidth="4"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="65 35"
                transform="rotate(-90 18 18)"
              />
            </svg>
            <span className="font-medium min-w-0">
              {lang === 'en'
                ? 'Market reality: Over 65% of premium tenancy contracts in Dubai still rely on physical post-dated cheques.'
                : 'واقع السوق: أكثر من 65% من عقود الإيجار السكنية الفاخرة في دبي لا تزال تعتمد على الشيكات المصرفية المؤجلة.'}
            </span>
          </div>
          <span className="text-[#C5A880] font-semibold shrink-0 text-xs">
            {lang === 'en' ? 'Sourced from Dubai Land Department market data' : 'مستند إلى بيانات دائرة الأراضي والأملاك في دبي'}
          </span>
        </div>
      </div>
    </section>
  );
};
