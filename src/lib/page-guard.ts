import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getDictionary } from "@/i18n";
import { SLUG_TO_ROLE, type Role } from "@/lib/types";
import { roleHomePath } from "@/lib/rbac";
import { notFound } from "next/navigation";

/**
 * Server guard for role-scoped pages:
 *  - anonymous → /sign-in
 *  - unknown slug → 404
 *  - role mismatch → own role home
 */
export async function guardRole(slug: string): Promise<{
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  role: Role;
  dict: Awaited<ReturnType<typeof getDictionary>>["dict"];
  locale: Awaited<ReturnType<typeof getDictionary>>["locale"];
}> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const role = SLUG_TO_ROLE[slug];
  if (!role) notFound();
  if (session.role !== role) redirect(roleHomePath(session.role));
  const { dict, locale } = await getDictionary();
  return { session, role, dict, locale };
}
