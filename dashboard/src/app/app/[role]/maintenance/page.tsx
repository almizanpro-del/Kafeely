import { guardRole } from "@/lib/page-guard";
import { getTenantTickets, getTenantUnitForCreate } from "@/lib/data/tenant";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { TenantMaintenanceView } from "@/components/dash/tenant/maintenance-view";

export const dynamic = "force-dynamic";

export default async function TenantMaintenancePage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  if (role !== "tenant") return null;

  const tickets = await getTenantTickets(session.sub);
  const unit = await getTenantUnitForCreate(session.sub);

  return (
    <>
      <PageHeader title={dict.tenant.maintenanceTenant.title} description={dict.tenant.maintenanceTenant.desc} />
      <TenantMaintenanceView
        tickets={tickets}
        unit={unit}
        propertyId={unit?.propertyId ?? (await db.property.findFirst())?.id ?? ""}
        dict={dict}
        locale={locale}
      />
    </>
  );
}
