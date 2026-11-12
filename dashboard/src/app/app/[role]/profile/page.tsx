import { guardRole } from "@/lib/page-guard";
import { db } from "@/lib/db";
import { ProfileView } from "@/components/dash/shared/profile-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, dict, locale } = await guardRole(slug);
  const user = await db.user.findUnique({ where: { id: session.sub } });

  return (
    <ProfileView
      fullName={user?.fullName ?? session.fullName}
      email={user?.email ?? session.email}
      roleLabel={dict.role[session.role].label}
      organization={user?.organization ?? null}
      jobTitle={user?.jobTitle ?? null}
      memberSince={(user?.createdAt ?? new Date()).toISOString()}
      lastLogin={user?.lastLoginAt?.toISOString() ?? null}
      locale={locale}
      dict={dict}
    />
  );
}
