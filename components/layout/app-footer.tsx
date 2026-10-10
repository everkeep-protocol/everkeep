import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { CLUSTER_LABELS, SOLANA_CLUSTER, SOLANA_RPC_URL } from "@/lib/everkeep/config";

export function AppFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
        <p>
          EverKeep · Programmable Digital Continuity · Prototype. Connected to{" "}
          {CLUSTER_LABELS[SOLANA_CLUSTER]} ({SOLANA_RPC_URL}).
        </p>
        <nav className="flex gap-4">
          <Link href={ROUTES.home} className="hover:text-everkeep-emerald">
            Home
          </Link>
          <Link href={ROUTES.dashboard} className="hover:text-everkeep-emerald">
            Dashboard
          </Link>
          <Link href={ROUTES.claim} className="hover:text-everkeep-emerald">
            Beneficiary Claim
          </Link>
        </nav>
      </div>
    </footer>
  );
}
