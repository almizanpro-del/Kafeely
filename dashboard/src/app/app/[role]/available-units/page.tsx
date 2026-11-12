import { guardRole } from "@/lib/page-guard";
import { getAvailableUnits } from "@/lib/data/leasing";
import { PageHeader } from "@/components/shared/page-header";
import { AvailableUnitsView } from "@/components/dash/leasing/available-view";

export const dynamic = "force-dynamic";

export default async function AvailableUnitsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { role, dict, locale } = await guardRole(slug);
  if (role !== "leasing") return null;
  const units = await getAvailableUnits();

  return (
    <>
      <PageHeader title={dict.leasing.available.title} description={dict.leasing.available.desc} />
      <AvailableUnitsView units={units} dict={dict} locale={locale} />
    </>
  );
}
