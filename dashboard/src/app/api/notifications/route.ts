import { NextRequest, NextResponse } from "next/server";
import { getNotifications, getUnreadCount, markNotificationsRead } from "@/lib/data/base";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const userId = req.nextUrl.searchParams.get("userId") ?? session?.sub;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [notifications, unread] = await Promise.all([getNotifications(userId), getUnreadCount(userId)]);
  return NextResponse.json({ notifications, unread });
}

export async function POST(req: NextRequest) {
  const { userId } = (await req.json()) as { userId?: string };
  const session = await getSession();
  const target = userId ?? session?.sub;
  if (!target) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await markNotificationsRead(target);
  return NextResponse.json({ ok: true });
}
