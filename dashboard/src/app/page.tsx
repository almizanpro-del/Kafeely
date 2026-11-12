import Link from "next/link";
import { getDictionary } from "@/i18n";
import { ROLES, ROLE_SLUGS } from "@/lib/types";
import { ArrowLeft, ArrowRight, Building2, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const ROLE_ICONS: Record<string, React.ElementType> = {
  super_admin: ShieldCheck, landlord: Building2, tenant: Users,
  broker: ArrowRight, agent: Users, facility: Building2, leasing: Building2,
};

export default async function PortalPage() {
  const { dict, locale } = await getDictionary();
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="lux-radial min-h-dvh">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <span className="flex items-center gap-2.5">
          { }
          <img src="/kafeely-mark.png" alt="Kafeely" className="size-8" />
          <span className="font-display text-xl font-semibold tracking-wide">{dict.common.brand}</span>
        </span>
        <Button asChild size="sm" className="bg-[#c5a880] font-medium text-[#0b132b] hover:bg-[#d4b98f]">
          <Link href="/sign-in">{dict.portal.enter}</Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        {/* Hero */}
        <section className="fade-up py-14 text-center sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c5a880]">
            {dict.portal.eyebrow}
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            {dict.portal.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            {dict.portal.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-[#c5a880] font-semibold text-[#0b132b] hover:bg-[#d4b98f]">
              <Link href="/sign-in">
                {dict.portal.enter}
                <Arrow className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>

          <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: Users, value: "7", label: dict.portal.statUsers },
              { icon: Building2, value: "8", label: dict.portal.statDistricts },
              { icon: ShieldCheck, value: "AED 18.4M", label: dict.portal.statProtection },
            ].map((s) => (
              <div key={s.label} className="card-hover rounded-xl border bg-card/70 p-5 text-start">
                <s.icon className="size-5 text-[#c5a880]" aria-hidden />
                <dd className="tnum mt-3 text-2xl font-semibold">{s.value}</dd>
                <dt className="mt-1 text-xs text-muted-foreground">{s.label}</dt>
              </div>
            ))}
          </dl>
        </section>

        {/* Role cards */}
        <section className="mt-4">
          <div className="hairline mb-10" aria-hidden />
          <h2 className="text-center font-display text-2xl font-semibold sm:text-3xl">{dict.portal.explore}</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">{dict.portal.exploreHint}</p>

          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role, i) => {
              const Icon = ROLE_ICONS[role];
              return (
                <li key={role} className={role === "leasing" ? "sm:col-span-2 lg:col-span-1 lg:col-start-2" : ""}>
                  <Link
                    href={`/sign-in?role=${ROLE_SLUGS[role]}`}
                    className="card-hover group flex h-full flex-col rounded-xl border bg-card/70 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-lg border border-[#c5a880]/25 bg-[#c5a880]/10">
                        <Icon className="size-5 text-[#c5a880]" aria-hidden />
                      </span>
                      <span className="tnum text-[10px] uppercase tracking-widest text-muted-foreground/60">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold">{dict.role[role].label}</h3>
                    <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                      {dict.role[role].desc}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#c5a880] opacity-0 transition-opacity group-hover:opacity-100">
                      {dict.portal.roleCardCta}
                      <Arrow className="size-3.5 rtl:rotate-180" aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border/60 px-4 py-6 text-center text-[11px] text-muted-foreground sm:px-6">
        {dict.common.brand} · {dict.portal.footerNote}
      </footer>
    </div>
  );
}
