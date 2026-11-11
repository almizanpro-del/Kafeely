import { guardRole } from "@/lib/page-guard";
import { getLandlordOverview } from "@/lib/data/landlord";
import { getAdminOverview } from "@/lib/data/admin";
import { getTenantLease, getTenantTickets } from "@/lib/data/tenant";
import { getLeads, getCommissions } from "@/lib/data/broker";
import { getAgentTargets, getAgencyTeam, getAgentLeads } from "@/lib/data/agent";
import { getFmProperties, getFmTickets, getFmInspections } from "@/lib/data/facility";
import { getAvailableUnits, getApplications, getViewings, getLeasingOffers } from "@/lib/data/leasing";
import { LandlordOverview } from "@/components/dash/landlord/overview";
import { TenantOverview } from "@/components/dash/tenant/overview";
import { AdminOverview } from "@/components/dash/admin/overview";
import { BrokerOverview } from "@/components/dash/broker/overview";
import { AgentOverview } from "@/components/dash/agent/overview";
import { FacilityOverview } from "@/components/dash/facility/overview";
import { LeasingOverview } from "@/components/dash/leasing/overview";

export const dynamic = "force-dynamic";

export default async function RoleOverviewPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  const roleSlug = slug;

  switch (role) {
    case "landlord": {
      const data = await getLandlordOverview(session.sub);
      return <LandlordOverview data={data} dict={dict} locale={locale} roleSlug={roleSlug} />;
    }
    case "tenant": {
      const [lease, tickets] = await Promise.all([getTenantLease(session.sub), getTenantTickets(session.sub)]);
      return <TenantOverview lease={lease} tickets={tickets} dict={dict} locale={locale} roleSlug={roleSlug} />;
    }
    case "super_admin": {
      const data = await getAdminOverview();
      return <AdminOverview data={data} dict={dict} />;
    }
    case "broker": {
      const [leads, commissions] = await Promise.all([getLeads(session.sub), getCommissions(session.sub)]);
      return <BrokerOverview leads={leads} commissions={commissions} dict={dict} locale={locale} roleSlug={roleSlug} />;
    }
    case "agent": {
      const db = (await import("@/lib/db")).db;
      const user = await db.user.findUnique({ where: { id: session.sub } });
      const [targets, team, leads] = await Promise.all([
        getAgentTargets(session.sub),
        getAgencyTeam(user?.agencyId ?? "none"),
        getAgentLeads(session.sub),
      ]);
      return <AgentOverview targets={targets} team={team} leads={leads} dict={dict} locale={locale} roleSlug={roleSlug} fullName={session.fullName} />;
    }
    case "facility": {
      const [properties, tickets, inspections] = await Promise.all([
        getFmProperties(session.sub),
        getFmTickets(session.sub),
        getFmInspections(session.sub),
      ]);
      return <FacilityOverview properties={properties} tickets={tickets} inspections={inspections} dict={dict} locale={locale} />;
    }
    case "leasing": {
      const [units, applications, viewings, offers] = await Promise.all([
        getAvailableUnits(),
        getApplications(),
        getViewings(),
        getLeasingOffers(),
      ]);
      return <LeasingOverview units={units} applications={applications} viewings={viewings} offers={offers} dict={dict} locale={locale} />;
    }
  }
}
