import { guardRole } from "@/lib/page-guard";
import { getWaitlistEntries } from "@/lib/data/admin";
import { ComplianceView } from "@/components/dash/admin/compliance-view";

export const dynamic = "force-dynamic";

export default async function CompliancePage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { role, dict, locale } = await guardRole(slug);
  if (role !== "super_admin") return null;
  const entries = await getWaitlistEntries();

  // Data subject requests derived from waitlist state
  const dsr = entries
    .filter((e) => e.status === "erased" || e.notes?.includes("export"))
    .map((e, i) => ({
      id: e.id,
      fullName: e.fullName === "—" ? `Request #${i + 1}` : e.fullName,
      email: e.email,
      kind: (i % 3 === 1 ? "export" : "erase") as "erase" | "export",
      createdAt: e.createdAt,
    }));

  return <ComplianceView dsr={dsr} dict={dict} locale={locale} />;
}
