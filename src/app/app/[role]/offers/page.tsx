import { guardRole } from "@/lib/page-guard";
import { getLeasingOffers } from "@/lib/data/leasing";
import { PageHeader } from "@/components/shared/page-header";
import { OffersView } from "@/components/dash/shared/offers-view";

export const dynamic = "force-dynamic";

export default async function OffersPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { role, dict, locale } = await guardRole(slug);
  if (role !== "agent" && role !== "leasing") return null;
  const rows = await getLeasingOffers();

  return (
    <>
      <PageHeader
        title={role === "agent" ? dict.agent.offersAgent.title : dict.leasing.offersLeasing.title}
        description={role === "agent" ? dict.agent.offersAgent.desc : dict.leasing.offersLeasing.desc}
      />
      <OffersView rows={rows} dict={dict} locale={locale} />
    </>
  );
}
