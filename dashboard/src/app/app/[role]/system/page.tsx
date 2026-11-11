import { guardRole } from "@/lib/page-guard";
import { SystemView } from "@/components/dash/admin/system-view";

export const dynamic = "force-dynamic";

export default async function SystemPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { role, dict } = await guardRole(slug);
  if (role !== "super_admin") return null;
  return <SystemView dict={dict} />;
}
