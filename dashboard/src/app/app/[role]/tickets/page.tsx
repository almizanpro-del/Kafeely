import { guardRole } from "@/lib/page-guard";
import { getFmTickets, getVendors, getFmProperties } from "@/lib/data/facility";
import { PageHeader } from "@/components/shared/page-header";
import { FmTicketsView } from "@/components/dash/facility/tickets-view";

export const dynamic = "force-dynamic";

export default async function FmTicketsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  if (role !== "facility") return null;

  const [tickets, vendors, properties] = await Promise.all([
    getFmTickets(session.sub),
    getVendors(),
    getFmProperties(session.sub),
  ]);

  return (
    <>
      <PageHeader title={dict.facility.ticketsFm.title} description={dict.facility.ticketsFm.desc} />
      <FmTicketsView
        tickets={tickets}
        vendors={vendors.map((v) => ({ id: v.id, name: v.name, category: v.category }))}
        properties={properties.map((p) => ({ id: p.id, name: p.name }))}
        dict={dict}
        locale={locale}
      />
    </>
  );
}
