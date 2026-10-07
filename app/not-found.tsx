import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return (
    <AppShell className="flex flex-col items-center py-24 text-center">
      <p className="font-mono text-sm text-everkeep-cyan">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        This page doesn&apos;t exist
      </h1>
      <p className="mt-3 text-muted-foreground">
        The route you requested isn&apos;t part of the EverKeep app.
      </p>
      <Button asChild className="mt-8">
        <Link href={ROUTES.home}>Back to home</Link>
      </Button>
    </AppShell>
  );
}
