import React from 'react';
import { Language } from '../types';
import { content } from '../content/translations';
import { KeyRound, ShieldCheck, Building2, Landmark } from 'lucide-react';

interface ServiceFlowDiagramProps {
  lang: Language;
}

/**
 * ServiceFlowDiagram — the service-explainer infographic.
 *
 * A symmetric three-node composition (Tenant — Kafeely — Landlord) so the
 * layout is direction-agnostic: under RTL the flex row mirrors naturally and
 * every label stays in reading order. Below it, an illustrative 12-month
 * lease timeline highlights the up-to-3-month rent continuity window.
 *
 * Every label/figure comes from the approved translations (Definitions sheet,
 * Nov 2026). No new public claims are introduced here.
 */
export const ServiceFlowDiagram: React.FC<ServiceFlowDiagramProps> = ({ lang }) => {
  const t = content[lang].serviceDiagram;

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  // Illustrative disruption point: month 7, window covers months 7-9.
  const disruptionAt = 7;
  const windowEnd = disruptionAt + 3; // exclusive

  const sideNodeClass =
    'flex-1 rounded-xl border border-slate-800 bg-[#0B132B]/90 p-4 sm:p-5 shadow-md';
  const bulletClass = 'flex items-start gap-2 text-[11px] sm:text-xs text-slate-300 leading-relaxed';
  const bulletDotClass = 'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C5A880]/70';

  const connectorChip = (label: string) => (
    <span className="inline-block max-w-[11rem] rounded-full border border-slate-700 bg-[#0E1B38] px-2.5 py-1 text-center text-[10px] font-semibold leading-tight text-[#E8D7B8]">
      {label}
    </span>
  );

  return (
    <div className="mt-12">
      {/* Section sub-header (matches the house editorial style) */}
      <div className="max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#C5A880]">
          {t.eyebrow}
        </div>
        <h3 className="mt-2 text-xl sm:text-2xl font-serif font-bold tracking-tight text-white leading-tight">
          {t.title}
        </h3>
        <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      {/* Infographic canvas */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-[#0A1024]/80 p-5 sm:p-8 shadow-lg">
        {/* --- Three-node flow (symmetric; mirrors automatically in RTL) --- */}
        <div className="flex flex-col lg:flex-row lg:items-stretch">
          {/* Node: Tenant */}
          <div className={sideNodeClass}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 text-[#C5A880]">
                <KeyRound className="h-4 w-4" />
              </div>
              <div className="font-serif font-semibold text-white text-sm sm:text-base">
                {t.tenantLabel}
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className={bulletClass}>
                <span className={bulletDotClass} aria-hidden="true" />
                <span>{t.tenantPoint1}</span>
              </div>
              <div className={bulletClass}>
                <span className={bulletDotClass} aria-hidden="true" />
                <span>{t.tenantPoint2}</span>
              </div>
            </div>
          </div>

          {/* Connector: Tenant → Kafeely (vertical on mobile, horizontal on lg+) */}
          <div
            aria-hidden="true"
            className="flex flex-col items-center gap-1.5 py-3 lg:py-0 lg:flex-row lg:w-44 lg:px-1 lg:self-center"
          >
            <div className="lg:hidden h-4 w-px bg-slate-700" />
            {connectorChip(t.flowTenant)}
            <div className="relative h-px w-8 lg:h-px lg:w-full bg-slate-700">
              <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C5A880]" />
            </div>
            <div className="lg:hidden h-4 w-px bg-slate-700" />
          </div>

          {/* Node: Kafeely (emphasized center) */}
          <div className="relative flex-1 rounded-xl border border-[#C5A880]/60 bg-[#111E38] p-4 sm:p-5 shadow-xl overflow-hidden">
            {/* Soft gold glow, same recipe as the hero backdrop */}
            <div
              aria-hidden="true"
              className="absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-[#C5A880]/15 blur-2xl"
            />
            <div className="relative">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C5A880] bg-[#C5A880] text-[#0B132B]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="font-serif font-semibold text-[#E8D7B8] text-sm sm:text-base">
                  {t.kafeelyLabel}
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className={bulletClass}>
                  <span className={bulletDotClass} aria-hidden="true" />
                  <span>{t.kafeelyPoint1}</span>
                </div>
                <div className={bulletClass}>
                  <span className={bulletDotClass} aria-hidden="true" />
                  <span>{t.kafeelyPoint2}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connector: Kafeely → Landlord */}
          <div
            aria-hidden="true"
            className="flex flex-col items-center gap-1.5 py-3 lg:py-0 lg:flex-row lg:w-44 lg:px-1 lg:self-center"
          >
            <div className="lg:hidden h-4 w-px bg-slate-700" />
            {connectorChip(t.flowLandlord)}
            <div className="relative h-px w-8 lg:h-px lg:w-full bg-slate-700">
              <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C5A880]" />
            </div>
            <div className="lg:hidden h-4 w-px bg-slate-700" />
          </div>

          {/* Node: Landlord */}
          <div className={sideNodeClass}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 text-[#C5A880]">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="font-serif font-semibold text-white text-sm sm:text-base">
                {t.landlordLabel}
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className={bulletClass}>
                <span className={bulletDotClass} aria-hidden="true" />
                <span>{t.landlordPoint1}</span>
              </div>
              <div className={bulletClass}>
                <span className={bulletDotClass} aria-hidden="true" />
                <span>{t.landlordPoint2}</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- Licensed underwriter capacity beneath the Kafeely layer --- */}
        <div className="mt-6 flex flex-col items-center">
          <div aria-hidden="true" className="h-6 w-px border-l border-dashed border-slate-600" />
          <div className="flex max-w-md items-center gap-3 rounded-lg border border-dashed border-[#C5A880]/40 bg-[#0E1B38]/70 px-4 py-2.5 text-center sm:text-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C5A880]/15 text-[#C5A880]">
              <Landmark className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">{t.underwriterLabel}</div>
              <div className="mt-0.5 text-[10px] text-slate-400 leading-relaxed">
                {t.underwriterNote}
              </div>
            </div>
          </div>
        </div>

        {/* --- Illustrative 12-month lease timeline --- */}
        <div className="mt-8 border-t border-slate-800 pt-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C5A880]">
            {t.timelineTitle}
          </div>
          <div dir="ltr" className="flex gap-1">
            {months.map((mo) => {
              const isDisruption = mo === disruptionAt;
              const inWindow = mo >= disruptionAt && mo < windowEnd;
              return (
                <div key={mo} className="flex-1">
                  <div
                    className={`h-7 sm:h-8 rounded-md border ${
                      isDisruption
                        ? 'border-amber-400/70 bg-amber-400/25'
                        : inWindow
                        ? 'border-[#C5A880]/70 bg-[#C5A880]/25'
                        : 'border-slate-800 bg-[#0E1B38]/70'
                    }`}
                  />
                  <div className="mt-1 text-center text-[9px] leading-none text-slate-500 tabular-nums">
                    {mo}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-amber-400/80" aria-hidden="true" />
              {t.disruptionLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#C5A880]/70" aria-hidden="true" />
              {t.windowLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#0E1B38] border border-slate-800" aria-hidden="true" />
              {t.standardLabel}
            </span>
            <span className="text-slate-500 tabular-nums">
              {t.monthLabel} 1–12
            </span>
          </div>
        </div>

        {/* Compliance footnote */}
        <p className="mt-5 border-t border-slate-800/80 pt-4 text-[11px] text-slate-500 leading-relaxed">
          {t.footnote}
        </p>
      </div>
    </div>
  );
};
