import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/session";
import HomePage from "@/app/page";

export default async function AdminEditModePage() {
  const role = await getSessionRole();
  if (role !== "admin") {
    redirect("/adminlog");
  }

  // We simply render the exact same HomePage. 
  // The CmsProvider will handle rendering the edit controls seamlessly because of the route path match.
  return <HomePage />;
}
