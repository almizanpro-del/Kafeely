import { guardRole } from "@/lib/page-guard";
import { getFmAnnouncements, getFmProperties } from "@/lib/data/facility";
import { PageHeader } from "@/components/shared/page-header";
import { AnnouncementsView } from "@/components/dash/facility/announcements-view";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role: slug } = await params;
  const { session, role, dict, locale } = await guardRole(slug);
  if (role !== "facility") return null;

  const [announcements, properties] = await Promise.all([
    getFmAnnouncements(session.sub),
    getFmProperties(session.sub),
  ]);

  return (
    <>
      <PageHeader title={dict.facility.announcements.title} description={dict.facility.announcements.desc} />
      <AnnouncementsView
        announcements={announcements}
        properties={properties.map((p) => ({ id: p.id, name: p.name }))}
        dict={dict}
        locale={locale}
      />
    </>
  );
}
