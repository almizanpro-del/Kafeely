import { guardRole } from "@/lib/page-guard";
import { getLandlordDocuments, getLandlordUnits } from "@/lib/data/landlord";
import { getTenantDocuments, getTenantLease } from "@/lib/data/tenant";
import { getApplications } from "@/lib/data/leasing";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentsView } from "@/components/dash/landlord/documents-view";
import { LeasingDocGenView } from "@/components/dash/leasing/doc-gen-view";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);

  if (role === "landlord") {
    const [docs, units] = await Promise.all([getLandlordDocuments(session.sub), getLandlordUnits(session.sub)]);
    return (
      <>
        <PageHeader title={dict.landlord.documents.title} description={dict.landlord.documents.desc} />
        <DocumentsView
          docs={docs}
          unitOptions={units.map((u) => ({ id: u.id, code: u.code }))}
          dict={dict}
          locale={locale}
        />
      </>
    );
  }

  if (role === "tenant") {
    const docs = await getTenantDocuments(session.sub);
    return (
      <>
        <PageHeader title={dict.landlord.documents.title} description={dict.landlord.documents.desc} />
        <DocumentsView docs={docs} dict={dict} locale={locale} canUpload={false} />
      </>
    );
  }

  if (role === "leasing") {
    const apps = await getApplications();
    return (
      <>
        <PageHeader title={dict.leasing.documentsLeasing.title} description={dict.leasing.documentsLeasing.desc} />
        <LeasingDocGenView applications={apps} dict={dict} locale={locale} />
      </>
    );
  }

  return null;
}
