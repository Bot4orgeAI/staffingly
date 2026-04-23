import { Outlet, useLocation } from "react-router-dom";
import { useAuthUserQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";

function getShellMeta(pathname) {
  if (pathname.startsWith("/prior-auth-case")) {
    return {
      title: "Prior Authorization Case",
      breadcrumbs: ["Prior Auth", "Case"],
    };
  }

  return {
    title: "Prior Authorization",
    breadcrumbs: ["Prior Auth"],
  };
}

export default function PriorAuthShell() {
  const { data: user } = useAuthUserQuery();
  const location = useLocation();
  const meta = getShellMeta(location.pathname);

  return (
    <StaffinglyLayout
      user={user}
      currentPage="prior-auth"
      title={meta.title}
      breadcrumbs={meta.breadcrumbs}
    >
      <Outlet />
    </StaffinglyLayout>
  );
}
