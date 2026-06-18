import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isAdminAuthenticated } from "@/lib/admin-store";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Login Console — OHCTECH" }] }),
  beforeLoad: () => {
    if (!isAdminAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: () => <Outlet />,
});
