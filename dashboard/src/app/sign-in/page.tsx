import { db } from "@/lib/db";
import { getDictionary } from "@/i18n";
import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const { dict } = await getDictionary();
  const users = await db.user.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "asc" },
    select: { email: true, fullName: true, role: true, avatarSeed: true },
  });
  // one demo account per role (primary seeded user)
  const seen = new Set<string>();
  const demoAccounts = users.filter((u) => (seen.has(u.role) ? false : (seen.add(u.role), true)));

  return (
    <div className="lux-radial flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md fade-up">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2.5">
            { }
            <img src="/kafeely-logo.png" alt="Kafeely — safe home rental" className="h-14 w-auto" />
          </a>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">{dict.auth.welcome}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{dict.auth.signInSubtitle}</p>
        </div>
        <SignInForm dict={dict} demoAccounts={demoAccounts} />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <a href="/" className="underline-offset-4 transition hover:text-foreground hover:underline">
            ← {dict.auth.backToSite}
          </a>
        </p>
      </div>
    </div>
  );
}
