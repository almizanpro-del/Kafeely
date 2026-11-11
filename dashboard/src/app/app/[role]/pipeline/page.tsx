import { guardRole } from "@/lib/page-guard";
import { getLeads } from "@/lib/data/broker";
import { PageHeader } from "@/components/shared/page-header";
import { PipelineView } from "@/components/dash/broker/pipeline-view";

export const dynamic = "force-dynamic";

export default async function PipelinePage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict } = await guardRole(slug);
  if (role !== "broker" && role !== "agent") return null;
  const leads = await getLeads(session.sub);

  return (
    <>
      <PageHeader title={dict.broker.pipeline.title} description={dict.broker.pipeline.desc} />
      <PipelineView leads={leads} dict={dict} />
    </>
  );
}
