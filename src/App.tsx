import React, { Suspense, useEffect, useState } from 'react';
import { Language, AudienceRole } from './types';
import { Navbar } from './components/Navbar';
import { HeroSlider } from './components/HeroSlider';
import { ProblemSection } from './components/ProblemSection';
import { HowItWorks } from './components/HowItWorks';
import { AudienceForms } from './components/AudienceForms';
import { MarketSources } from './components/MarketSources';
import { AuthLinkFlows } from './components/AuthLinkFlows';
import { NotFoundPage } from './components/NotFoundPage';
import { CookieBanner } from './components/CookieBanner';
import { PrivacyModal, TermsModal } from './components/TermsAndPrivacyModals';
import { Footer } from './components/Footer';

// The Super-Admin console is hidden and rarely used; loading it on demand
// keeps its auth/console code out of the public landing-page bundle.
const AdminPortal = React.lazy(() =>
  import('./components/AdminPortal').then((module) => ({ default: module.AdminPortal })),
);

export default function App() {
  // Default to Arabic across all pages as requested.
  // FR-13: remember the visitor's language choice across visits.
  const [lang, setLang] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('kafeely_lang');
      return stored === 'en' || stored === 'ar' ? stored : 'ar';
    } catch {
      return 'ar';
    }
  });
  const [selectedRole, setSelectedRole] = useState<AudienceRole>('owner');
  const [prefillArea, setPrefillArea] = useState<string | undefined>(undefined);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  // Hidden super-admin access: no public link anywhere.
  // Reachable only by visiting the direct URL .../#super-admin
  // (the console itself is additionally protected by real account
  // authentication — see src/utils/auth.ts).
  //
  // Robustness: a few real-world conditions can make the simple
  // "check once + hashchange" approach miss the hash:
  //   - browsers restoring the tab from the back/forward cache (bfcache)
  //     do not re-run mount effects and may skip hashchange,
  //   - some chat apps / link resolvers strip the "#..." fragment when
  //     opening shared links,
  //   - a stale cached page opened before a deployment keeps running old
  //     code until the next full reload.
  // We therefore accept #super-admin in any letter case (plus the
  // "#/super-admin" variant), accept ?admin=1 as a fragment-free fallback,
  // and re-check on hashchange and pageshow (bfcache restore) — no polling
  // loop, so the landing page does no work while the console is closed.
  //
  // Closing the console clears the fragment so the listeners cannot
  // immediately re-open it against the user's wish.
  useEffect(() => {
    const matchesAdminHash = () =>
      /^#\/?super-admin\/?$/i.test(window.location.hash.trim());

    const openIfAdmin = () => {
      if (matchesAdminHash()) {
        setIsAdminOpen(true);
        return;
      }
      // Fragment-free fallback: some contexts strip the "#..." part of a
      // shared URL. ?admin=1 reaches the same console and the URL is
      // normalized back to the canonical hidden hash.
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('admin') === '1') {
          window.history.replaceState(
            null,
            '',
            window.location.pathname + '#super-admin',
          );
          setIsAdminOpen(true);
        }
      } catch {
        /* URLSearchParams unavailable in this context — ignore */
      }
    };

    openIfAdmin();
    window.addEventListener('hashchange', openIfAdmin);
    window.addEventListener('pageshow', openIfAdmin);
    return () => {
      window.removeEventListener('hashchange', openIfAdmin);
      window.removeEventListener('pageshow', openIfAdmin);
    };
  }, []);

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    // Remove the #super-admin fragment so neither the listeners nor a later
    // poll re-open the console right after the user chose to close it.
    try {
      if (/^#\/?super-admin/i.test(window.location.hash.trim())) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch {
      /* history unavailable — non-fatal */
    }
  };

  // Sync document direction and language attribute for RTL/LTR Arabic support
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('kafeely_lang', lang);
    } catch {
      /* private browsing — non-fatal */
    }
  }, [lang]);

  const handleSelectAudience = (role: AudienceRole, area?: string) => {
    setSelectedRole(role);
    if (area) {
      setPrefillArea(area);
    }
    // Audience cards and hero CTAs must take the visitor to the matching form
    // (role pre-selected). Same smooth scroll as the navbar waitlist link.
    const element = document.getElementById('audiences');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigateToWaitlist = () => {
    const element = document.getElementById('audiences');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Single-page app: the only meaningful document is the root path. The
  // hosting layer already returns a real HTTP 404 (public/404.html) for
  // unknown paths; this client-side guard keeps the landing page from ever
  // rendering under a bogus path (e.g. /wp-admin/...) on hosts that ignore
  // the 404 configuration. Must sit after all hooks (stable hook order).
  const unknownPath =
    window.location.pathname !== '/' && window.location.pathname !== '/index.html';
  if (unknownPath) {
    return <NotFoundPage />;
  }

  return (
    <div className={`min-h-screen bg-[#070D1E] text-slate-100 flex flex-col font-sans selection:bg-[#C5A880]/30 selection:text-[#E8D7B8] ${lang === 'ar' ? 'font-arabic' : ''}`}>
      {/* Top Bar Navigation */}
      <Navbar
        lang={lang}
        onLanguageChange={setLang}
        onNavigateToWaitlist={handleNavigateToWaitlist}
      />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* 1. Luxury Hero Slider with Dubai Cityscapes */}
        <HeroSlider lang={lang} onSelectAudience={handleSelectAudience} />

        {/* 2. Core Problem Points */}
        <ProblemSection lang={lang} />

        {/* 3. Five-Stage Interactive Mechanism Diagram */}
        <HowItWorks lang={lang} />

        {/* 4. Audience Portals & Waitlist / Interest Capture Forms */}
        <AudienceForms
          lang={lang}
          selectedRole={selectedRole}
          prefillArea={prefillArea}
          onRoleChange={setSelectedRole}
        />

        {/* 5. Documented Market Sourcing & Compliance Framework */}
        <MarketSources lang={lang} />
      </main>

      {/* Footer */}
      <Footer
        lang={lang}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenTerms={() => setIsTermsOpen(true)}
      />

      {/* Super-Admin Console — hidden; opens only via #super-admin + account credentials.
          Lazy-loaded so its code is not part of the landing-page bundle. */}
      {isAdminOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
              <p className="text-xs text-slate-300">Loading console…</p>
            </div>
          }
        >
          <AdminPortal onClose={handleCloseAdmin} />
        </Suspense>
      )}

      {/* Emailed link flows: #verify-email?token=… / #reset-password?token=… */}
      <AuthLinkFlows />

      {/* Privacy Notice Modal */}
      {isPrivacyOpen && (
        <PrivacyModal lang={lang} onClose={() => setIsPrivacyOpen(false)} />
      )}

      {/* Terms of Use & Disclaimer Modal */}
      {isTermsOpen && (
        <TermsModal lang={lang} onClose={() => setIsTermsOpen(false)} />
      )}

      {/* Granular Cookie Consent Banner */}
      <CookieBanner lang={lang} onOpenPrivacy={() => setIsPrivacyOpen(true)} />
    </div>
  );
}
