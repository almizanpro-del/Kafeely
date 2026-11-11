import { guardRole } from "@/lib/page-guard";
import { getViewings } from "@/lib/data/leasing";
import { PageHeader } from "@/components/shared/page-header";
import { ViewingsView } from "@/components/dash/leasing/viewings-view";

export const dynamic = "force-dynamic";

export default async function ViewingsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { role, dict, locale } = await guardRole(slug);
  if (role !== "leasing") return null;
  const rows = await getViewings();

  return (
    <>
      <PageHeader title={dict.leasing.viewings.title} description={dict.leasing.viewings.desc} />
      <ViewingsView rows={rows} dict={dict} locale={locale} />
    </>
  );
}
