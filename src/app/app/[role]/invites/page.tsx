import { guardRole } from "@/lib/page-guard";
import { getLandlordInvites } from "@/lib/data/landlord";
import { PageHeader } from "@/components/shared/page-header";
import { InvitesView } from "@/components/dash/landlord/invites-view";

export const dynamic = "force-dynamic";

export default async function LandlordInvitesPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  if (role !== "landlord") return null;
  const invites = await getLandlordInvites(session.sub);

  return (
    <>
      <PageHeader title={dict.landlord.invites.title} description={dict.landlord.invites.desc} />
      <InvitesView invites={invites} dict={dict} locale={locale} />
    </>
  );
}
