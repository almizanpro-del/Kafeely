import { guardRole } from "@/lib/page-guard";
import { getLandlordLeases } from "@/lib/data/landlord";
import { PageHeader } from "@/components/shared/page-header";
import { LeasesView } from "@/components/dash/landlord/leases-view";

export const dynamic = "force-dynamic";

export default async function LandlordLeasesPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  if (role !== "landlord") return null;
  const leases = await getLandlordLeases(session.sub);

  return (
    <>
      <PageHeader title={dict.landlord.leases.title} description={dict.landlord.leases.desc} />
      <LeasesView leases={leases} dict={dict} locale={locale} />
    </>
  );
}
