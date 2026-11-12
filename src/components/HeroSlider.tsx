import React, { useState, useEffect, useRef } from 'react';
import { Language, AudienceRole } from '../types';
import { content } from '../content/translations';
import { LuxuryBeamCard } from './LuxuryBeamCard';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  MapPin,
  Eye,
  EyeOff,
  Building2,
  KeyRound,
  Briefcase,
  Landmark,
  ChevronDown,
} from 'lucide-react';

import imgDowntown from '../assets/images/dubai_penthouse_skyline_1794333686988.webp';
import imgPalm from '../assets/images/dubai_palm_waterfront_villa_1794333687412.webp';
import imgDifc from '../assets/images/dubai_difc_luxury_residence_1794333688950.webp';
import imgHills from '../assets/images/dubai_hills_golf_villa_1794333688330.webp';
import imgBugatti from '../assets/images/binghatti_bugatti_residences.webp';
import imgMercedes from '../assets/images/binghatti_mercedes_benz_places.webp';
import imgAquarise from '../assets/images/binghatti_aquarise.webp';

interface HeroSliderProps {
  lang: Language;
  onSelectAudience: (role: AudienceRole, prefillArea?: string) => void;
}

interface SlideData {
  id: string;
  districtEn: string;
  districtAr: string;
  propertyTitleEn: string;
  propertyTitleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  rentEn: string;
  rentAr: string;
  metricsEn: string;
  metricsAr: string;
  cityscapeType: 'downtown' | 'palm' | 'difc' | 'dubaihills' | 'businessbay';
  highlightEn: string;
  highlightAr: string;
  imagePath: string;
}

const SLIDES: SlideData[] = [
  {
    id: 'slide_downtown',
    districtEn: 'Downtown Dubai',
    districtAr: 'وسط مدينة دبي (داون تاون)',
    propertyTitleEn: 'The Royal Sky Penthouse',
    propertyTitleAr: 'بنتهاوس الأفق الملكي · داون تاون دبي',
    descriptionEn: 'Double-height luxury residence with panoramic skyline views overlooking Burj Khalifa, illuminated fountains, and the central financial boulevard.',
    descriptionAr: 'صالة معيشة ملكية بارتفاع مضاعف مع إطلالة بانورامية كاملة على برج خليفة المتلألئ ونافورة دبي وناطحات السحاب.',
    rentEn: 'AED 480,000 / yr',
    rentAr: '480,000 د.إ / سنوياً',
    metricsEn: 'Floor 72 · Sky Penthouse · Tier A Covenant',
    metricsAr: 'الطابق 72 · بنتهاوس الأفق · تصنيف ملاءة أ',
    cityscapeType: 'downtown',
    highlightEn: 'Burj Khalifa Panoramic View',
    highlightAr: 'إطلالة مباشرة على برج خليفة',
    imagePath: imgDowntown,
  },
  {
    id: 'slide_palm',
    districtEn: 'Palm Jumeirah',
    districtAr: 'نخلة جميرا · الواجهة المائية',
    propertyTitleEn: 'Signature Waterfront Pavilion',
    propertyTitleAr: 'قصر الواجهة المائية · نخلة جميرا',
    descriptionEn: 'Exclusive beachfront estate featuring an infinity pool terrace framing the illuminated Dubai Marina skyline and Ain Dubai horizon across the gulf.',
    descriptionAr: 'قصر شاطئي فاخر مع مسبح لا متناهي وتراس مفتوح يؤطر أفق دبي مارينا المضيء وعين دبي وقت الغروب الذهبي.',
    rentEn: 'AED 950,000 / yr',
    rentAr: '950,000 د.إ / سنوياً',
    metricsEn: 'Private Beach · 6 Bed Signature · Corporate Lease',
    metricsAr: 'شاطئ خاص · 6 غرف نوم فاخرة · عقد إيجار مؤسسي',
    cityscapeType: 'palm',
    highlightEn: 'Dubai Marina & Gulf Skyline',
    highlightAr: 'إطلالة أفق مارينا دبي والخليج',
    imagePath: imgPalm,
  },
  {
    id: 'slide_difc',
    districtEn: 'DIFC',
    districtAr: 'مركز دبي المالي العالمي (DIFC)',
    propertyTitleEn: 'Executive High-Floor Residence',
    propertyTitleAr: 'أجنحة رجال الأعمال الفاخرة · DIFC',
    descriptionEn: 'Metropolitan architectural luxury above Gate Avenue with floor-to-ceiling glass capturing the glowing futuristic skyline and financial district towers.',
    descriptionAr: 'إقامة راقية بتشطيبات الجوز والنحاس وواجهات زجاجية واسعة ترصد ناطحات السحاب ومتحف المستقبل.',
    rentEn: 'AED 340,000 / yr',
    rentAr: '340,000 د.إ / سنوياً',
    metricsEn: 'Floor 48 · 2 Bed Duplex · Executive Transfer',
    metricsAr: 'الطابق 48 · دوبلكس غرفتين · منتدب تنفيذي لشركة دولية',
    cityscapeType: 'difc',
    highlightEn: 'Futuristic Financial Towers View',
    highlightAr: 'إطلالة ناطحات السحاب المالية الحديثة',
    imagePath: imgDifc,
  },
  {
    id: 'slide_dubaihills',
    districtEn: 'Dubai Hills Estate',
    districtAr: 'تلال دبي (دبي هيلز استيت)',
    propertyTitleEn: 'Fairway View Minimalist Villa',
    propertyTitleAr: 'فيلا الجولف الحديثة · دبي هيلز',
    descriptionEn: 'Contemporary limestone villa with expansive living spaces looking over manicured golf fairways toward the shimmering distant Dubai city horizon.',
    descriptionAr: 'فيلا زجاجية معاصرة بمساحات معيشة واسعة تطل على مروج الجولف الخضراء مع ظهور خط أفق دبي في الأفق البعيد.',
    rentEn: 'AED 620,000 / yr',
    rentAr: '620,000 د.إ / سنوياً',
    metricsEn: 'Championship Golf Front · 5 Bed · Family Office',
    metricsAr: 'مباشرة على ملعب الجولف · 5 غرف · استثمار عائلي',
    cityscapeType: 'dubaihills',
    highlightEn: 'Golf & Downtown Skyline Horizon',
    highlightAr: 'إطلالة تجمع بين الجولف وأفق دبي',
    imagePath: imgHills,
  },
  {
    id: 'slide_bugatti',
    districtEn: 'Business Bay',
    districtAr: 'الخليج التجاري',
    propertyTitleEn: 'Bugatti Residences by Binghatti',
    propertyTitleAr: 'إقامات بوغاتي من بن غاتي',
    descriptionEn: "World-first Bugatti branded residence in Business Bay — a fluid French Riviera-inspired tower of 171 Riviera Mansions and 11 Sky Mansion penthouses, minutes from Burj Khalifa.",
    descriptionAr: 'أول إقامة تحمل علامة بوغاتي في العالم في الخليج التجاري — برج انسيابي مستوحى من الريفييرا الفرنسية يضم 171 قصراً و11 بنتهاوس فاخراً على بُعد دقائق من برج خليفة.',
    rentEn: 'AED 1,380,000 / yr',
    rentAr: '1,380,000 د.إ / سنوياً',
    metricsEn: '48 Storeys · Riviera Mansion · Branded Residence',
    metricsAr: '48 طابقاً · قصر ريفييرا · إقامة بعلامة عالمية',
    cityscapeType: 'businessbay',
    highlightEn: "World's First Bugatti Branded Residences",
    highlightAr: 'أولى إقامات بوغاتي في العالم',
    imagePath: imgBugatti,
  },
  {
    id: 'slide_mercedes',
    districtEn: 'Downtown Dubai',
    districtAr: 'وسط مدينة دبي',
    propertyTitleEn: 'Mercedes-Benz Places by Binghatti',
    propertyTitleAr: 'مرسيدس بنز بليسز من بن غاتي',
    descriptionEn: 'Automotive-inspired hyper-tower rising 296 metres above Downtown Dubai with 4.2-metre ceiling heights, targeting handover in Q4 2026 as the first Mercedes-Benz branded residence.',
    descriptionAr: 'برج فائق الطول مستوحى من عالم السيارات بارتفاع 296 متراً فوق وسط مدينة دبي بأسقف تصل إلى 4.2 أمتار، وتسليم مستهدف في الربع الرابع 2026 كأول إقامة تحمل علامة مرسيدس بنز.',
    rentEn: 'AED 520,000 / yr',
    rentAr: '520,000 د.إ / سنوياً',
    metricsEn: '70 Storeys · 296 m · Q4 2026 Handover',
    metricsAr: '70 طابقاً · 296 متراً · تسليم الربع الرابع 2026',
    cityscapeType: 'downtown',
    highlightEn: "World's First Mercedes-Benz Branded Residences",
    highlightAr: 'أولى إقامات مرسيدس بنز في العالم',
    imagePath: imgMercedes,
  },
  {
    id: 'slide_aquarise',
    districtEn: 'Business Bay',
    districtAr: 'الخليج التجاري',
    propertyTitleEn: 'Binghatti Aquarise',
    propertyTitleAr: 'بن غاتي أكوارايز',
    descriptionEn: 'Vibrant waterfront community of 1,598 modern residences and 28 retail spaces on the Business Bay canal, with scheduled handover in Q2 2027.',
    descriptionAr: 'مجتمع واجهة مائية نابض يضم 1,598 وحدة سكنية عصرية و28 وحدة تجارية على خور الخليج التجاري، مع تسليم مجدول في الربع الثاني 2027.',
    rentEn: 'AED 125,000 / yr',
    rentAr: '125,000 د.إ / سنوياً',
    metricsEn: '1,598 Residences · 28 Retail · Canal Community',
    metricsAr: '1,598 وحدة سكنية · 28 متجراً · مجتمع الواجهة المائية',
    cityscapeType: 'businessbay',
    highlightEn: '1,598-Unit Waterfront Community',
    highlightAr: 'مجتمع واجهة مائية يضم 1,598 وحدة',
    imagePath: imgAquarise,
  },
];

export const HeroSlider: React.FC<HeroSliderProps> = ({ lang, onSelectAudience }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showOverlayCard, setShowOverlayCard] = useState(true);

  // Touch Swipe Gesture State (Left to Right / Right to Left)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const SLIDE_DURATION = 6500; // 6.5s per slide

  // Autoplay timer with clean single interval, zero DOM thrashing
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_DURATION);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const goToSlide = (idx: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIdx(idx);
  };

  const nextSlide = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIdx((prev) => (prev + 1) % SLIDES.length);
  };

  const prevSlide = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIdx((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  // Mobile Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;

    // Only trigger if horizontal swipe is dominant and exceeds threshold
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (lang === 'ar') {
        // In RTL Arabic, swiping towards the left goes to next, right to prev
        if (deltaX > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      } else {
        if (deltaX > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const scrollToOverviewIntro = () => {
    const el = document.getElementById('audiences-intro');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const currentSlide = SLIDES[currentIdx];
  const t = content[lang];
  const m = t.metricsStrip;

  return (
    <>
      {/* 1. Full-Page Viewport Hero Slider (Fits 100% of Desktop Screen without scrolling!) */}
      <section
        id="overview"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-[calc(100vh-4.5rem)] min-h-[480px] overflow-hidden bg-[#070D1E] select-none"
        style={{ overflowAnchor: 'none' }}
      >
        {/* Full-view Image Canvas (Bright, high-contrast, crystal-clear Dubai cityscapes) */}
        <div className="absolute inset-0 overflow-hidden">
          {SLIDES.map((slide, sIdx) => {
            const isActive = sIdx === currentIdx;
            // Only keep the current frame and its two neighbours mounted with
            // a src: the inactive slides are fully transparent, so eagerly
            // decoding all seven ~150 kB cityscapes just slows first paint.
            const distance = Math.min(
              Math.abs(sIdx - currentIdx),
              SLIDES.length - Math.abs(sIdx - currentIdx),
            );
            const shouldLoad = distance <= 1;
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {shouldLoad && (
                  <img
                    src={slide.imagePath}
                    alt={lang === 'ar' ? slide.propertyTitleAr : slide.propertyTitleEn}
                    referrerPolicy="no-referrer"
                    loading={isActive ? 'eager' : 'lazy'}
                    fetchPriority={isActive ? 'high' : 'low'}
                    decoding="async"
                    className="w-full h-full object-cover object-center brightness-[1.09] contrast-[1.03] saturate-[1.06]"
                  />
                )}
                {/* Minimal top and bottom scrims for legibility without darkening center imagery */}
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#070D1E]/80 via-[#070D1E]/40 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#070D1E]/90 via-[#070D1E]/40 to-transparent pointer-events-none" />
              </div>
            );
          })}
        </div>

        {/* Top Floating Control Bar over Image */}
        <div className="relative z-30 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* District & Highlight Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-[#C5A880]/60 bg-[#070D1E]/85 px-3.5 py-1.5 text-xs font-semibold text-[#E8D7B8] shadow-lg backdrop-blur-md">
              <MapPin className="h-3.5 w-3.5 text-[#C5A880]" />
              <span>{lang === 'ar' ? currentSlide.districtAr : currentSlide.districtEn}</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-[#070D1E]/80 px-3 py-1.5 text-xs text-white shadow-md backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-[#C5A880]" />
              <span>{lang === 'ar' ? currentSlide.highlightAr : currentSlide.highlightEn}</span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-amber-900/60 bg-[#16120C]/80 px-3 py-1.5 text-xs font-medium text-[#E8D7B8] backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#C5A880]" />
              <span>{t.brand.statusNotice}</span>
            </div>
          </div>

          {/* Quick Actions: View Toggle + Slide Navigation */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Toggle to hide/show info box completely for unobstructed photo viewing */}
            <button
              type="button"
              onClick={() => setShowOverlayCard(!showOverlayCard)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#070D1E]/85 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:border-[#C5A880] transition-colors shadow-lg backdrop-blur-md"
              title={
                showOverlayCard
                  ? lang === 'ar'
                    ? 'عرض الصورة كاملة بدون نصوص'
                    : 'View full unobstructed photo'
                  : lang === 'ar'
                  ? 'إظهار بيانات العقار'
                  : 'Show property details'
              }
            >
              {showOverlayCard ? (
                <EyeOff className="h-3.5 w-3.5 text-[#C5A880]" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-[#C5A880]" />
              )}
              <span className="hidden sm:inline">
                {showOverlayCard
                  ? lang === 'ar'
                    ? 'إخفاء النص'
                    : 'Full Photo'
                  : lang === 'ar'
                  ? 'إظهار التفاصيل'
                  : 'Show Card'}
              </span>
            </button>

            {/* Slider Controls */}
            <div className="flex items-center gap-1.5 bg-[#070D1E]/90 rounded-xl p-1 border border-slate-700/80 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5 text-[#C5A880]" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-[#C5A880]" />
                )}
              </button>
              <div className="h-3 w-[1px] bg-slate-700" />
              <button
                type="button"
                onClick={prevSlide}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                aria-label="Previous property"
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </button>
              <span className="font-mono text-xs font-bold text-[#E8D7B8] px-1">
                0{currentIdx + 1} / 0{SLIDES.length}
              </span>
              <button
                type="button"
                onClick={nextSlide}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                aria-label="Next property"
              >
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Floating Luxury Corner Card with TRAVELING BORDER BEAM & INTERNAL LIGHT BEAM */}
        {showOverlayCard && (
          <div className="absolute z-30 bottom-14 sm:bottom-16 start-4 sm:start-6 max-w-lg animate-in fade-in slide-in-from-bottom-3 duration-300">
            <LuxuryBeamCard
              hasBorderBeam={true}
              hasLightBeam={true}
              innerClassName="p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C5A880]">
                  {lang === 'ar' ? currentSlide.metricsAr : currentSlide.metricsEn}
                </span>
                <span className="font-serif text-sm sm:text-base font-bold text-[#E8D7B8]">
                  {lang === 'ar' ? currentSlide.rentAr : currentSlide.rentEn}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-serif font-bold text-white tracking-tight drop-shadow-md">
                {lang === 'ar' ? currentSlide.propertyTitleAr : currentSlide.propertyTitleEn}
              </h2>

              <p className="mt-1 text-xs text-slate-200 line-clamp-2 leading-relaxed font-sans">
                {lang === 'ar' ? currentSlide.descriptionAr : currentSlide.descriptionEn}
              </p>

              {/* Inline Action Bar */}
              <div className="mt-3.5 pt-3 border-t border-slate-700/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#C5A880]" />
                  <span>{lang === 'ar' ? 'حماية إيجار حتى 3 أشهر متواصلة' : 'Up to 3-Mo Lease Protection'}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectAudience('owner', currentSlide.districtEn);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#C5A880] px-3.5 py-1.5 text-xs font-bold text-[#0B132B] hover:bg-[#D5BD97] transition-colors shadow-md"
                >
                  <span>{lang === 'ar' ? 'تسجيل أولوية العقار' : 'Join Priority Waitlist'}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </LuxuryBeamCard>
          </div>
        )}

        {/* 3. Slider Progress Bar */}
        <div className="absolute z-30 bottom-12 inset-x-0 h-1 bg-slate-800/80 pointer-events-none overflow-hidden">
          <div
            key={`progress-${currentIdx}-${isPlaying}`}
            className={`h-full bg-gradient-to-r from-[#C5A880] via-[#E8D7B8] to-[#C5A880] shadow-[0_0_8px_rgba(197,168,128,0.7)] ${
              isPlaying ? 'animate-slide-progress' : 'w-full'
            }`}
          />
        </div>

        {/* 4. Bottom Thumbnails Strip (Minimal, fixed, non-scrolling) */}
        <div className="absolute z-30 bottom-0 inset-x-0 h-12 bg-[#070D1E]/95 border-t border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-3 overflow-hidden select-none">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SLIDES.map((slide, sIdx) => {
              const isActive = sIdx === currentIdx;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={(e) => goToSlide(sIdx, e)}
                  className={`shrink-0 flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'border border-[#C5A880] bg-[#111E38] text-white shadow-md'
                      : 'border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="font-mono text-[10px] text-[#C5A880] font-bold">0{sIdx + 1}</span>
                  <span className="font-sans text-[11px]">{lang === 'ar' ? slide.districtAr : slide.districtEn}</span>
                </button>
              );
            })}
          </div>

          {/* Scroll Prompt Button (Clickable prompt down to audiences and market stats) */}
          <button
            type="button"
            onClick={scrollToOverviewIntro}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-slate-400 hover:text-[#C5A880] transition-colors cursor-pointer"
          >
            <span>{lang === 'ar' ? 'استكشف مسارات الانضمام' : 'Explore Portals & Data'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#C5A880]" />
          </button>
        </div>
      </section>

      {/* 2. Dedicated Section: Priority Waitlist Portals & Sourced Market Metrics */}
      <section
        id="audiences-intro"
        className="relative border-t border-slate-800/80 bg-[#070D1E] py-10 lg:py-14"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-[#C5A880]" />
              <span>{lang === 'ar' ? 'الانضمام الفوري لقائمة انتظار عقارات دبي الفاخرة:' : 'Join Priority Waitlist by Role:'}</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {lang === 'ar' ? 'تسجيل مبكر ومجاني' : 'Pre-Launch Roster'}
            </span>
          </div>

          {/* 4 Audience Cards (Refined luxury styling) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Owner */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectAudience('owner', currentSlide.districtEn);
              }}
              className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-[#0B132B]/90 p-4 text-start transition-all hover:border-[#C5A880] hover:bg-[#111E38] hover:shadow-xl focus-visible:ring-1 focus-visible:ring-[#C5A880]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C5A880]/15 text-[#C5A880] group-hover:bg-[#C5A880] group-hover:text-[#0B132B] transition-colors">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-[#E8D7B8] transition-colors truncate">
                    {lang === 'ar' ? 'أنا مالك / مستثمر' : 'I am a Landlord'}
                  </div>
                  <div className="text-[11px] text-[#C5A880] truncate">
                    {lang === 'ar' ? 'حماية دخل الإيجار' : 'Protect Rental Income'}
                  </div>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-[#C5A880] transition-colors shrink-0 ms-2" />
            </button>

            {/* 2. Tenant */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectAudience('tenant', currentSlide.districtEn);
              }}
              className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-[#0B132B]/90 p-4 text-start transition-all hover:border-[#C5A880] hover:bg-[#111E38] hover:shadow-xl focus-visible:ring-1 focus-visible:ring-[#C5A880]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C5A880]/15 text-[#C5A880] group-hover:bg-[#C5A880] group-hover:text-[#0B132B] transition-colors">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-[#E8D7B8] transition-colors truncate">
                    {lang === 'ar' ? 'أنا مستأجر تنفيذي' : 'I am a Tenant'}
                  </div>
                  <div className="text-[11px] text-[#C5A880] truncate">
                    {lang === 'ar' ? 'استئجار بدون تأمين ضخم' : 'Deposit-Free Lease'}
                  </div>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-[#C5A880] transition-colors shrink-0 ms-2" />
            </button>

            {/* 3. Partner */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectAudience('partner');
              }}
              className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-[#0B132B]/90 p-4 text-start transition-all hover:border-[#C5A880] hover:bg-[#111E38] hover:shadow-xl focus-visible:ring-1 focus-visible:ring-[#C5A880]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 group-hover:bg-[#C5A880] group-hover:text-[#0B132B] transition-colors">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-[#E8D7B8] transition-colors truncate">
                    {lang === 'ar' ? 'مديرو عقارات ومطورون' : 'Managers & Developers'}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {lang === 'ar' ? 'طلب ملف الشراكة والوحدات' : 'Pilot Briefing'}
                  </div>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-[#C5A880] transition-colors shrink-0 ms-2" />
            </button>

            {/* 4. Investor */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectAudience('investor');
              }}
              className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-[#0B132B]/90 p-4 text-start transition-all hover:border-[#C5A880] hover:bg-[#111E38] hover:shadow-xl focus-visible:ring-1 focus-visible:ring-[#C5A880]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 group-hover:bg-[#C5A880] group-hover:text-[#0B132B] transition-colors">
                  <Landmark className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-[#E8D7B8] transition-colors truncate">
                    {lang === 'ar' ? 'مستثمرون مؤسسيون' : 'Institutional Investors'}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {lang === 'ar' ? 'الملف الاستثماري السري' : 'Confidential Pack'}
                  </div>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-[#C5A880] transition-colors shrink-0 ms-2" />
            </button>
          </div>

          {/* Sourced Market Metrics Strip (PRD Sections 1 & 8) */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-[#0B132B]/90 p-4 shadow-sm">
              <div className="text-xl sm:text-2xl font-bold text-white tabular-nums">
                {m.item1.value}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-200">
                {m.item1.label}
              </div>
              {/* Mini infographic: position on a 0–10% yield scale (decorative) */}
              <div aria-hidden="true" className="mt-2.5">
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full w-[73%] rounded-full bg-white/80" />
                </div>
                <div className="mt-1 flex justify-between text-[9px] leading-none text-slate-500 tabular-nums">
                  <span>0%</span>
                  <span>10%</span>
                </div>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-400">
                <span>{m.item1.source}</span> · <span>{m.item1.date}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B132B]/90 p-4 shadow-sm">
              <div className="text-xl sm:text-2xl font-bold text-[#E8D7B8] tabular-nums">
                {m.item2.value}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-200">
                {m.item2.label}
              </div>
              {/* Mini infographic: position on the same 0–10% scale (decorative) */}
              <div aria-hidden="true" className="mt-2.5">
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full w-[81%] rounded-full bg-[#C5A880]" />
                </div>
                <div className="mt-1 flex justify-between text-[9px] leading-none text-slate-500 tabular-nums">
                  <span>0%</span>
                  <span>10%</span>
                </div>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-400">
                <span>{m.item2.source}</span> · <span>{m.item2.date}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B132B]/90 p-4 shadow-sm">
              <div className="text-xl sm:text-2xl font-bold text-[#C5A880] tabular-nums">
                {m.item3.value}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-200">
                {m.item3.label}
              </div>
              {/* Mini infographic: 3 highlighted months within a 12-month lease (decorative) */}
              <div aria-hidden="true" className="mt-2.5 flex gap-[3px]">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-3 flex-1 rounded-[2px] ${
                      i < 3 ? 'bg-[#C5A880]/85' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <div className="mt-1 text-[9px] leading-none text-slate-500 tabular-nums">
                {lang === 'ar' ? '3 من 12 شهراً · توضيحي' : '3 of 12 lease months · illustrative'}
              </div>
              <div className="mt-1.5 text-[11px] text-slate-400">
                <span>{m.item3.source}</span> · <span>{m.item3.date}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B132B]/90 p-4 shadow-sm">
              <div className="text-xl sm:text-2xl font-bold text-slate-200 tabular-nums">
                {m.item4.value}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-200">
                {m.item4.label}
              </div>
              {/* Mini infographic: threshold marker on a 0–1M+ rent scale (decorative) */}
              <div aria-hidden="true" className="mt-2.5">
                <div className="relative h-1.5 rounded-full bg-slate-800">
                  <div className="absolute inset-y-0 end-0 w-[82%] rounded-full bg-slate-200/40" />
                  <div className="absolute inset-y-[-3px] start-[18%] w-px bg-[#C5A880]" />
                </div>
                <div className="mt-1 flex justify-between text-[9px] leading-none text-slate-500 tabular-nums">
                  <span>AED 0</span>
                  <span>1M+</span>
                </div>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-400">
                <span>{m.item4.source}</span> · <span>{m.item4.date}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
