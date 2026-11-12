import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language } from '../types';
import { content } from '../content/translations';
import { Globe, Menu, X, ChevronRight, Shield, ArrowUpRight } from 'lucide-react';

interface NavbarProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onNavigateToWaitlist: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onLanguageChange,
  onNavigateToWaitlist,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = content[lang];

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleLanguage = () => {
    onLanguageChange(lang === 'en' ? 'ar' : 'en');
  };

  const navLinks = [
    { label: t.nav.overview, href: '#overview' },
    { label: t.nav.howItWorks, href: '#how-it-works' },
    { label: t.nav.audiences, href: '#audiences' },
    { label: t.nav.marketData, href: '#market-data' },
    { label: t.nav.compliance, href: '#compliance' },
  ];

  const handleLinkClick = (href: string) => {
    setMobileMenuOpen(false);
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isRtl = lang === 'ar';

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070D1E]/95 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Official Brand Logo */}
          <a
            href="#overview"
            className="flex items-center shrink-0 focus-visible:outline-none py-1"
            aria-label="Kafeely Dubai"
          >
            <img
              src="/assets/kafeely-logo.png"
              alt="الكفيل - Kafeely | safe home rental"
              decoding="async"
              className="h-11 sm:h-13 w-auto object-contain transition-transform hover:scale-105"
            />
          </a>

          {/* Zone 2: Refined Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="whitespace-nowrap shrink-0 transition-colors hover:text-[#C5A880] focus-visible:outline-none focus-visible:text-[#C5A880]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Zone 3: Language Toggle and Primary CTA */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Language Toggle */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-[#C5A880]/50 hover:text-white focus-visible:ring-1 focus-visible:ring-[#C5A880]"
              aria-label="Toggle Arabic / English language"
              title="Switch Language"
            >
              <Globe className="h-3.5 w-3.5 text-[#C5A880]" />
              <span className="font-sans font-semibold">
                {lang === 'en' ? 'العربية' : 'English'}
              </span>
            </button>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={onNavigateToWaitlist}
              className="rounded-md bg-[#C5A880] px-4 py-2 text-xs font-semibold text-[#0B132B] shadow-sm transition-all hover:bg-[#D5BD97] hover:shadow-[0_0_15px_rgba(197,168,128,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880] whitespace-nowrap shrink-0"
            >
              {t.nav.joinWaitlist}
            </button>

            {/* Mobile hamburger button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex lg:hidden items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 p-2 text-slate-300 hover:border-[#C5A880] hover:text-[#E8D7B8] transition-colors focus-visible:outline-none"
              aria-label="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Natural, Ultra-Premium Native Mobile Drawer attached directly to document.body via Portal */}
      {/* mobileMenuOpen can only be set by user interaction, i.e. always after mount. */}
      {mobileMenuOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] lg:hidden"
            dir={isRtl ? 'rtl' : 'ltr'}
            role="dialog"
            aria-modal="true"
          >
            {/* Deep Dimmed Backdrop Scrim */}
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
            />

            {/* Solid Luxury Drawer Panel */}
            <div
              className={`absolute top-0 bottom-0 ${
                isRtl ? 'right-0' : 'left-0'
              } w-[86vw] max-w-sm h-full bg-[#070D1E] ${
                isRtl ? 'border-l' : 'border-r'
              } border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col justify-between z-10`}
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/90 bg-[#0B132B]">
                <img
                  src="/assets/kafeely-logo.png"
                  alt="الكفيل"
                  loading="lazy"
                  decoding="async"
                  className="h-10 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-[#C5A880] transition-colors"
                  aria-label="Close Menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Drawer Body */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                {/* Segmented Language Selector */}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    {lang === 'ar' ? 'اللغة / Language' : 'Language'}
                  </div>
                  <div className="flex items-center rounded-xl border border-slate-700/80 bg-slate-900 p-1">
                    <button
                      type="button"
                      onClick={() => onLanguageChange('ar')}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                        lang === 'ar'
                          ? 'bg-[#C5A880] text-[#0B132B] shadow-sm'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      العربية
                    </button>
                    <button
                      type="button"
                      onClick={() => onLanguageChange('en')}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                        lang === 'en'
                          ? 'bg-[#C5A880] text-[#0B132B] shadow-sm'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* Primary Navigation Links */}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    {lang === 'ar' ? 'أقسام الموقع' : 'Navigation'}
                  </div>
                  <nav className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-[#0B132B]/80 px-3">
                    {navLinks.map((link) => (
                      <button
                        key={link.href}
                        type="button"
                        onClick={() => handleLinkClick(link.href)}
                        className="w-full py-3.5 flex items-center justify-between text-start text-sm font-medium text-slate-200 hover:text-[#C5A880] transition-colors group cursor-pointer"
                      >
                        <span className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                          {link.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-[#C5A880] rtl:rotate-180 transition-colors" />
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Regulatory / Compliance Notice */}
                <div className="rounded-xl border border-slate-800/90 bg-[#0B132B]/60 p-3.5 text-xs text-slate-400 leading-relaxed flex items-start gap-2.5">
                  <Shield className="h-4 w-4 text-[#C5A880] shrink-0 mt-0.5" />
                  <span>
                    {lang === 'ar'
                      ? 'منصة استكشافية لما قبل الإطلاق لحماية عقود الإيجار السكنية الفاخرة بدبي.'
                      : 'Pre-launch platform for Dubai luxury residential lease protection.'}
                  </span>
                </div>
              </div>

              {/* Bottom Fixed Action Controls */}
              <div className="p-5 border-t border-slate-800 bg-[#0B132B] space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigateToWaitlist();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#C5A880] py-3 text-xs sm:text-sm font-bold text-[#0B132B] shadow-lg hover:bg-[#D5BD97] transition-colors cursor-pointer"
                >
                  <span>{t.nav.joinWaitlist}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
