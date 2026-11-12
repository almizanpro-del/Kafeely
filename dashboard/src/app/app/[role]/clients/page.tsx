import { guardRole } from "@/lib/page-guard";
import { getClients, getLeads } from "@/lib/data/broker";
import { PageHeader } from "@/components/shared/page-header";
import { ClientsView } from "@/components/dash/broker/clients-view";

export const dynamic = "force-dynamic";

export default async function ClientsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  if (role !== "broker" && role !== "agent") return null;

  const [clients, leads] = await Promise.all([getClients(session.sub), getLeads(session.sub)]);
  const byName = new Map(leads.map((l) => [l.clientName, l]));
  const rows = clients.map((c) => ({
    id: `${c.name}-${c.since}`,
    name: c.name,
    type: c.type,
    stage: (byName.get(c.name)?.stage ?? "new") as never,
    phone: c.phone,
    email: c.email,
    since: c.since,
    budgetAed: byName.get(c.name)?.budgetAed ?? null,
  }));

  return (
    <>
      <PageHeader title={dict.broker.clients.title} description={dict.broker.clients.desc} />
      <ClientsView rows={rows} dict={dict} locale={locale} />
    </>
  );
}
