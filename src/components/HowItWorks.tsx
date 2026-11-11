import React, { useState } from 'react';
import { Language } from '../types';
import { content } from '../content/translations';
import { LuxuryBeamCard } from './LuxuryBeamCard';
import { ServiceFlowDiagram } from './ServiceFlowDiagram';
import {
  FileText,
  UserCheck,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

interface HowItWorksProps {
  lang: Language;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ lang }) => {
  const [activeStage, setActiveStage] = useState<number>(0);
  const t = content[lang].howItWorks;

  const stageIcons = [FileText, UserCheck, CreditCard, ShieldCheck, RefreshCw];

  return (
    <section id="how-it-works" className="relative border-t border-slate-800/80 bg-[#070D1E] pt-10 pb-20 lg:pt-14 lg:pb-28">
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

        {/* Diagram Horizontal Flow Tracker */}
        <div className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {t.steps.map((step, idx) => {
              const IconComp = stageIcons[idx];
              const isSelected = activeStage === idx;
              return (
                <button
                  key={step.stage}
                  type="button"
                  onClick={() => setActiveStage(idx)}
                  className={`group relative flex flex-col justify-between rounded-xl border p-4 text-start transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#C5A880] bg-[#111E38] shadow-lg ring-1 ring-[#C5A880]/30'
                      : 'border-slate-800/90 bg-[#0B132B]/80 hover:border-slate-700 hover:bg-[#0E1A38]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-[#C5A880] bg-[#C5A880] text-[#0B132B]'
                            : 'border-slate-700/80 bg-slate-800 text-[#C5A880] group-hover:border-[#C5A880]/50'
                        }`}
                      >
                        <IconComp className="h-4 w-4" />
                      </div>
                      <span className="font-mono text-xs font-bold text-[#E8D7B8]">
                        {step.stage}
                      </span>
                    </div>

                    <div className="mt-3 font-serif font-semibold text-sm sm:text-base text-white">
                      {step.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {step.summary}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-[#C5A880] font-semibold pt-2.5 border-t border-slate-800">
                    <span>
                      {isSelected
                        ? lang === 'en'
                          ? 'Active Stage'
                          : 'المرحلة النشطة'
                        : lang === 'en'
                        ? 'Inspect Step'
                        : 'عرض التفاصيل'}
                    </span>
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition-transform ${
                        isSelected ? 'rotate-90 text-[#E8D7B8]' : 'rtl:rotate-180'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Stage Deep-Dive Card with Traveling Border Line & Interior Light Beam */}
        <div className="mt-8">
          <LuxuryBeamCard
            hasBorderBeam={true}
            hasLightBeam={true}
            innerClassName="p-6 sm:p-8"
          >
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#C5A880]">
                    {t.steps[activeStage].stage}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#E8D7B8]">
                    {lang === 'en' ? 'Workflow Mechanism' : 'المواصفة التشغيلية المعتمدة'}
                  </span>
                </div>
                <h3 className="mt-1.5 text-xl sm:text-2xl font-serif font-bold text-white">
                  {t.steps[activeStage].name}: {t.steps[activeStage].summary}
                </h3>
              </div>

              <div className="rounded-lg border border-[#C5A880]/30 bg-[#111E38]/80 px-3.5 py-2 text-xs text-slate-200 shrink-0 self-start lg:self-auto">
                <span className="text-slate-400 font-medium">
                  {lang === 'en' ? 'Launch Status: ' : 'حالة الإطلاق: '}
                </span>
                <span className="text-[#E8D7B8] font-semibold">
                  {lang === 'en' ? 'Confirmed by Counsel prior to commercial rollout' : 'خاضع لاعتماد المستشار القانوني'}
                </span>
              </div>
            </div>

            {/* Split Content */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-7">
              {/* Operational Mechanism */}
              <div className="lg:col-span-7">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#C5A880] mb-2.5">
                  {lang === 'en' ? 'Operational Mechanism' : 'الآلية التشغيلية خطوة بخطوة'}
                </h4>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
                  {t.steps[activeStage].detail}
                </p>

                <div className="mt-5 flex flex-col gap-2.5">
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-[#C5A880] shrink-0 mt-0.5" />
                    <span>
                      {lang === 'en'
                        ? 'No upfront payments, insurance policy issuance, or binding securities contracts are active during this pre-launch waitlist phase.'
                        : 'لا يتم تحصيل مدفوعات مسبقة أو إصدار وثائق تأمين ملزمة خلال مرحلة قائمة الانتظار الحالية.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Decision Point Box */}
              <div className="lg:col-span-5">
                <div className="rounded-xl border border-[#C5A880]/30 bg-[#111E38]/90 p-5 shadow-lg">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#E8D7B8] uppercase tracking-wider mb-2.5">
                    <ShieldCheck className="h-4 w-4 text-[#C5A880]" />
                    <span>
                      {lang === 'en' ? 'Key Underwriting Gate' : 'محطة القرار ومعيار القبول والتحقق'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                    {t.steps[activeStage].decisionPoint}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-700/80 text-[11px] text-slate-400 font-medium">
                    {lang === 'en'
                      ? 'Compliance mandate: Audited against UAE Central Bank (CBUAE) regulatory register requirements.'
                      : 'الامتثال التنظيمي: متوافق مع متطلبات سجل مصرف الإمارات المركزي والأنظمة السارية.'}
                  </div>
                </div>
              </div>
            </div>
          </LuxuryBeamCard>
        </div>

        {/* Service-explainer infographic: protection layer at a glance + illustrative lease timeline */}
        <ServiceFlowDiagram lang={lang} />
      </div>
    </section>
  );
};
