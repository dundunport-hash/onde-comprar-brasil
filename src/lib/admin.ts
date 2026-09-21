import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";

export async function requireAdminSession() {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "ADMIN") {
    redirect("/");
  }

  return session;
}
