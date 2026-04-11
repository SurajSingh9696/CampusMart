import { redirect } from "next/navigation";

export default function SellerShortcutPage() {
  redirect("/auth/register/seller");
}
