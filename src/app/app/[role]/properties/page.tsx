import { guardRole } from "@/lib/page-guard";
import { getFmProperties } from "@/lib/data/facility";
import { PageHeader } from "@/components/shared/page-header";
import { PropertiesView } from "@/components/dash/facility/properties-view";

export const dynamic = "force-dynamic";

export default async function FmPropertiesPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  if (role !== "facility") return null;
  const properties = await getFmProperties(session.sub);

  return (
    <>
      <PageHeader title={dict.facility.propertiesFm.title} description={dict.facility.propertiesFm.desc} />
      <PropertiesView properties={properties} dict={dict} locale={locale} />
    </>
  );
}
