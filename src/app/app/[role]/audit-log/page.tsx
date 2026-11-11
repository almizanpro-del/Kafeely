import { guardRole } from "@/lib/page-guard";
import { getAuditLogs } from "@/lib/data/admin";
import { PageHeader } from "@/components/shared/page-header";
import { AuditView } from "@/components/dash/admin/audit-view";

export const dynamic = "force-dynamic";

export default async function AuditLogPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { role, dict, locale } = await guardRole(slug);
  if (role !== "super_admin") return null;
  const rows = await getAuditLogs();

  return (
    <>
      <PageHeader title={dict.admin.audit.title} description={dict.admin.audit.desc} />
      <AuditView rows={rows} dict={dict} locale={locale} />
    </>
  );
}
