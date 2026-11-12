import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getDictionary } from "@/i18n";
import { SLUG_TO_ROLE } from "@/lib/types";
import { roleHomePath } from "@/lib/rbac";
import { AppShell } from "@/components/app/app-shell";

export const dynamic = "force-dynamic";

export default async function RoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ role: string }>;
}) {
  const { role: slug } = await params;
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const role = SLUG_TO_ROLE[slug];
  if (!role) notFound();
  if (session.role !== role) redirect(roleHomePath(session.role));

  const { dict, locale } = await getDictionary();
  return (
    <AppShell role={role} fullName={session.fullName} avatarSeed={session.avatarSeed} dict={dict} locale={locale}>
      {children}
    </AppShell>
  );
}
