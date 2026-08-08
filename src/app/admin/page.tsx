import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** /admin is just an entry point — the guard lives in the (protected) layout. */
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
