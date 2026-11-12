import { guardRole } from "@/lib/page-guard";
import { getBrokerActivity } from "@/lib/data/broker";
import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { fmtDateTime } from "@/lib/format";
import { Activity, KanbanSquare, BadgeDollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  if (role !== "broker" && role !== "agent") return null;
  const feed = await getBrokerActivity(session.sub);

  return (
    <>
      <PageHeader title={dict.broker.activityBroker.title} description={dict.broker.activityBroker.desc} />
      <SectionCard bodyClassName="p-0">
        {feed.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Activity} title={dict.broker.activityBroker.empty} compact />
          </div>
        ) : (
          <ol className="relative divide-y divide-border/60">
            {feed.map((item) => (
              <li key={item.id} className="flex gap-3.5 px-5 py-4">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-muted-foreground">
                  {item.kind === "lead" ? <KanbanSquare className="size-4" aria-hidden /> : <BadgeDollarSign className="size-4 text-[#c5a880]" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <time className="tnum shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  {fmtDateTime(item.at, locale)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </>
  );
}
