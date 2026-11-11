import { guardRole } from "@/lib/page-guard";
import { getTenantPayments } from "@/lib/data/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { TenantPaymentsView } from "@/components/dash/tenant/payments-view";

export const dynamic = "force-dynamic";

export default async function TenantPaymentsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  if (role !== "tenant") return null;

  const payments = await getTenantPayments(session.sub);

  return (
    <>
      <PageHeader title={dict.tenant.paymentsTenant.title} description={dict.tenant.paymentsTenant.desc} />
      <TenantPaymentsView payments={payments} dict={dict} locale={locale} />
    </>
  );
}
