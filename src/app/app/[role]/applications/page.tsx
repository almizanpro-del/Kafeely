import { guardRole } from "@/lib/page-guard";
import { getApplications } from "@/lib/data/leasing";
import { PageHeader } from "@/components/shared/page-header";
import { ApplicationsView } from "@/components/dash/leasing/applications-view";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { role, dict, locale } = await guardRole(slug);
  if (role !== "leasing") return null;
  const apps = await getApplications();

  return (
    <>
      <PageHeader title={dict.leasing.applications.title} description={dict.leasing.applications.desc} />
      <ApplicationsView applications={apps} dict={dict} locale={locale} />
    </>
  );
}
