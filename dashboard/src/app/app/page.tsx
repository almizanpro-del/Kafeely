import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { roleHomePath } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AppIndexPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  redirect(roleHomePath(session.role));
}
