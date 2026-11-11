import { guardRole } from "@/lib/page-guard";
import { getLandlordUnits } from "@/lib/data/landlord";
import { PageHeader } from "@/components/shared/page-header";
import { UnitsTable } from "@/components/dash/landlord/units-table";

export const dynamic = "force-dynamic";

export default async function LandlordUnitsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  if (role !== "landlord") return null;
  const units = await getLandlordUnits(session.sub);

  return (
    <>
      <PageHeader title={dict.landlord.units.title} description={dict.landlord.units.desc} />
      <UnitsTable units={units} dict={dict} locale={locale} />
    </>
  );
}
