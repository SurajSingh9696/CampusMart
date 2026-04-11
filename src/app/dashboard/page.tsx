import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";

export default async function DashboardRedirectPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/auth/login");
  if (session.user.isBlocked) redirect("/blocked");

  if (session.user.role === "admin") redirect("/dashboard/admin");
  if (session.user.role === "seller") {
    if (session.user.sellerApprovalStatus !== "approved") redirect("/pending-approval");
    redirect("/dashboard/seller");
  }

  redirect("/dashboard/customer");
}
