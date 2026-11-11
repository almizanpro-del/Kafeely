import { guardRole } from "@/lib/page-guard";
import { getLandlordClaims, getLandlordUnits } from "@/lib/data/landlord";
import { getTenantClaims, getTenantUnitForCreate } from "@/lib/data/tenant";
import { getAdminClaims } from "@/lib/data/admin";
import { PageHeader } from "@/components/shared/page-header";
import { LandlordClaimsView } from "@/components/dash/landlord/claims-view";
import { AdminClaimsView } from "@/components/dash/admin/claims-view";

export const dynamic = "force-dynamic";

export default async function ClaimsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);

  if (role === "landlord") {
    const [claims, units] = await Promise.all([getLandlordClaims(session.sub), getLandlordUnits(session.sub)]);
    return (
      <>
        <PageHeader title={dict.landlord.claims.title} description={dict.landlord.claims.desc} />
        <LandlordClaimsView claims={claims} units={units} dict={dict} locale={locale} />
      </>
    );
  }

  if (role === "tenant") {
    const [claims, unit] = await Promise.all([getTenantClaims(session.sub), getTenantUnitForCreate(session.sub)]);
    return (
      <>
        <PageHeader title={dict.tenant.claimsTenant.title} description={dict.tenant.claimsTenant.desc} />
        <LandlordClaimsView
          claims={claims.map((c) => ({ ...c, raisedBy: session.fullName, property: c.property }))}
          units={unit ? [{ id: unit.unitId, code: unit.unitCode, property: unit.property } as never] : []}
          dict={dict}
          locale={locale}
        />
      </>
    );
  }

  if (role === "super_admin") {
    const claims = await getAdminClaims();
    return (
      <>
        <PageHeader title={dict.admin.claimsAdmin.title} description={dict.admin.claimsAdmin.desc} />
        <AdminClaimsView rows={claims} dict={dict} locale={locale} />
      </>
    );
  }

  return null;
}
