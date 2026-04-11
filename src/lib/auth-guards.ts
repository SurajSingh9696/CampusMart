import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Role } from "@/types";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.isBlocked) {
    return { error: NextResponse.json({ error: "Blocked by admin" }, { status: 403 }) };
  }
  return { session };
}

export async function requireRole(allowed: Role[]) {
  const result = await requireAuth();
  if ("error" in result) return result;

  if (!allowed.includes(result.session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return result;
}
