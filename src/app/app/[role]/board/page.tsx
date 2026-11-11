import { guardRole } from "@/lib/page-guard";
import { getFmBoardUnits } from "@/lib/data/facility";
import { PageHeader } from "@/components/shared/page-header";
import { UnitBoard } from "@/components/dash/facility/board-view";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict } = await guardRole(slug);
  if (role !== "facility") return null;
  const units = await getFmBoardUnits(session.sub);

  return (
    <>
      <PageHeader title={dict.facility.board.title} description={dict.facility.board.desc} />
      <UnitBoard units={units} dict={dict} />
    </>
  );
}
