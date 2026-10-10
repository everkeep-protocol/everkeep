"use client";

import Link from "next/link";
import { Globe, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { ROUTES } from "@/lib/constants";
import { CLUSTER_LABELS } from "@/lib/everkeep/config";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";

export function AppHeader() {
  const { wallet, vault } = useEverKeepApp();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-everkeep-slate/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href={ROUTES.home} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-everkeep-emerald/30 bg-everkeep-emerald/10">
            <Shield className="h-5 w-5 text-everkeep-emerald" />
          </div>
          <div>
            <span className="text-lg font-semibold tracking-tight">
              EverKeep
            </span>
            <p className="text-xs text-muted-foreground">
              Programmable Digital Continuity
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link
            href={ROUTES.home}
            className="text-muted-foreground transition-colors hover:text-everkeep-emerald"
          >
            Home
          </Link>
          {wallet.status === "connected" && (
            <Link
              href={ROUTES.dashboard}
              className="text-muted-foreground transition-colors hover:text-everkeep-emerald"
            >
              Dashboard
            </Link>
          )}
          <Link
            href={ROUTES.claim}
            className="text-muted-foreground transition-colors hover:text-everkeep-emerald"
          >
            Beneficiary Claim
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/15 px-3"
            title={`Cluster is set by NEXT_PUBLIC_SOLANA_CLUSTER`}
          >
            <Globe className="h-3.5 w-3.5" />
            <Badge
              variant={wallet.cluster === "mainnet" ? "mainnet" : "devnet"}
              className="border-0 px-1.5 py-0"
            >
              {wallet.cluster !== "mainnet" && (
                <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-everkeep-cyan" />
              )}
              {CLUSTER_LABELS[wallet.cluster]}
            </Badge>
          </div>

          {vault && wallet.status === "connected" && (
            <Badge variant="default" className="hidden sm:inline-flex">
              Plan Active
            </Badge>
          )}

          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
