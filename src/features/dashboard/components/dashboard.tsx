"use client";

import { RequirePermission } from "@/features/panel/components/require-permission";
import { useCan } from "@/lib/can";
import { sectionPermission } from "@/lib/routes";
import { OperatorDashboard } from "./operator-dashboard";
import { OwnerDashboard } from "./owner-dashboard";

/**
 * The dashboard page. Users with `report.view` (owner, manager) get the full
 * reports dashboard; others with `dashboard.view` (operator) the simpler one,
 * since every `/reports/*` route answers them 403.
 */
export function Dashboard() {
  return (
    <RequirePermission permission={sectionPermission.dashboard}>
      <DashboardForRole />
    </RequirePermission>
  );
}

function DashboardForRole() {
  const reports = useCan("report.view");
  return reports ? <OwnerDashboard /> : <OperatorDashboard />;
}
