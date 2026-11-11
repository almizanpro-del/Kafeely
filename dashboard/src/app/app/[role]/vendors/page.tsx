import { guardRole } from "@/lib/page-guard";
import { getVendors } from "@/lib/data/facility";
import { PageHeader } from "@/components/shared/page-header";
import { VendorsView } from "@/components/dash/facility/vendors-view";

export const dynamic = "force-dynamic";

export default async function VendorsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { role, dict, locale } = await guardRole(slug);
  if (role !== "facility") return null;
  const vendors = await getVendors();

  return (
    <>
      <PageHeader title={dict.facility.vendors.title} description={dict.facility.vendors.desc} />
      <VendorsView vendors={vendors} dict={dict} locale={locale} />
    </>
  );
}
