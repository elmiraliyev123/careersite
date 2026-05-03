import { redirect } from "next/navigation";

import { AdminPanelClient } from "@/components/admin-panel-client";
import { getAllCompanies, getAllJobs } from "@/lib/platform";
import { getSessionRole } from "@/lib/session";

export default async function AdminPage() {
  const role = await getSessionRole();

  if (role !== "admin") {
    redirect("/admin/login?next=/admin");
  }

  return (
    <main className="admin-console-page">
      <AdminPanelClient companies={await getAllCompanies()} jobs={await getAllJobs()} />
    </main>
  );
}
