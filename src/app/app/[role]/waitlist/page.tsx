import { guardRole } from "@/lib/page-guard";
import { getWaitlistEntries } from "@/lib/data/admin";
import { PageHeader } from "@/components/shared/page-header";
import { WaitlistView } from "@/components/dash/admin/waitlist-view";

export const dynamic = "force-dynamic";

export default async function WaitlistPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { role, dict, locale } = await guardRole(slug);
  if (role !== "super_admin") return null;
  const rows = await getWaitlistEntries();

  return (
    <>
      <PageHeader title={dict.admin.waitlist.title} description={dict.admin.waitlist.desc} />
      <WaitlistView rows={rows} dict={dict} locale={locale} />
    </>
  );
}
