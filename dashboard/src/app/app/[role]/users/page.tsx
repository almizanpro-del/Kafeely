import { guardRole } from "@/lib/page-guard";
import { getAdminUsers } from "@/lib/data/admin";
import { PageHeader } from "@/components/shared/page-header";
import { UsersView } from "@/components/dash/admin/users-view";

export const dynamic = "force-dynamic";

export default async function UsersPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { role, dict, locale } = await guardRole(slug);
  if (role !== "super_admin") return null;
  const rows = await getAdminUsers();

  return (
    <>
      <PageHeader title={dict.admin.users.title} description={dict.admin.users.desc} />
      <UsersView rows={rows} dict={dict} locale={locale} />
    </>
  );
}
