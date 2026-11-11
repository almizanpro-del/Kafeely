import { guardRole } from "@/lib/page-guard";
import { getBrokerListings } from "@/lib/data/broker";
import { PageHeader } from "@/components/shared/page-header";
import { ListingsView } from "@/components/dash/broker/listings-view";

export const dynamic = "force-dynamic";

export default async function ListingsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { role, dict, locale } = await guardRole(slug);
  if (role !== "broker" && role !== "agent") return null;
  const rows = await getBrokerListings();

  return (
    <>
      <PageHeader title={dict.broker.listingsBroker.title} description={dict.broker.listingsBroker.desc} />
      <ListingsView rows={rows} dict={dict} locale={locale} />
    </>
  );
}
