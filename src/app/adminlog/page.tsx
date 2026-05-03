import { redirect } from "next/navigation";

export default async function AdminLogPage() {
  redirect("/admin/login");
}
