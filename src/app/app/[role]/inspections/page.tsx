import { guardRole } from "@/lib/page-guard";
import { getFmInspections } from "@/lib/data/facility";
import { PageHeader } from "@/components/shared/page-header";
import { InspectionsView } from "@/components/dash/facility/inspections-view";

export const dynamic = "force-dynamic";

export default async function InspectionsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  if (role !== "facility") return null;
  const inspections = await getFmInspections(session.sub);

  return (
    <>
      <PageHeader title={dict.facility.inspections.title} description={dict.facility.inspections.desc} />
      <InspectionsView inspections={inspections} dict={dict} locale={locale} />
    </>
  );
}
