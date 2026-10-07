import { AppShell } from "@/components/layout/app-shell";
import { OwnerDashboard } from "@/components/dashboard/owner-dashboard";

export default function DashboardPage() {
  return (
    <AppShell>
      <OwnerDashboard />
    </AppShell>
  );
}
