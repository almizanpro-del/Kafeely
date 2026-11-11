import { guardRole } from "@/lib/page-guard";
import { getCommissions } from "@/lib/data/broker";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { CommissionsTable } from "@/components/dash/broker/commissions-table";
import { aed, num } from "@/lib/format";
import { BadgeDollarSign, Clock, CheckCircle2, Banknote } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CommissionsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict } = await guardRole(slug);
  if (role !== "broker" && role !== "agent") return null;
  const rows = await getCommissions(session.sub);

  const paid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amountAed, 0);
  const approved = rows.filter((r) => r.status === "approved").reduce((s, r) => s + r.amountAed, 0);
  const pending = rows.filter((r) => r.status === "pending").reduce((s, r) => s + r.amountAed, 0);

  return (
    <>
      <PageHeader title={dict.broker.commissions.title} description={dict.broker.commissions.desc} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Banknote} label={dict.broker.commissions.paidOut} value={aed(paid, { compact: true })} />
        <StatCard icon={CheckCircle2} label={dict.status.approved} value={aed(approved, { compact: true })} />
        <StatCard icon={Clock} label={dict.broker.commissions.awaiting} value={aed(pending, { compact: true })} accent />
        <StatCard icon={BadgeDollarSign} label={dict.common.total} value={aed(paid + approved + pending, { compact: true })} hint={`${num(rows.length)} ${dict.broker.commissions.deal.toLowerCase()}`} />
      </div>

      <SectionCard>
        <CommissionsTable rows={rows} dict={dict} />
      </SectionCard>
    </>
  );
}
