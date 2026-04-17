import { redirect } from "next/navigation";

import { AdminLoginPanel } from "@/components/admin-login-panel";
import { getSessionRole } from "@/lib/session";

export default async function AdminLoginPage() {
  const role = await getSessionRole();

  if (role === "admin") {
    redirect("/admin");
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-shell">
        <AdminLoginPanel />
      </div>
    </main>
  );
}
