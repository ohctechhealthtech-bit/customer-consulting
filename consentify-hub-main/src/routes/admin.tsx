import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isAdminAuthenticated } from "@/lib/admin-store";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Console — OHCTECH" }] }),
  beforeLoad: ({ location }) => {
    const isLoginRoute = location.pathname === "/admin/login";

    if (isLoginRoute) {
      if (isAdminAuthenticated()) {
        throw redirect({ to: "/admin" });
      }
      return;
    }

    if (!isAdminAuthenticated()) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: () => <Outlet />,
});
