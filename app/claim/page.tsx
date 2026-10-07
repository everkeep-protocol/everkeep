import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ClaimPageClient } from "@/components/claim/claim-page-client";

export default function ClaimPage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <ClaimPageClient />
      </Suspense>
    </AppShell>
  );
}
