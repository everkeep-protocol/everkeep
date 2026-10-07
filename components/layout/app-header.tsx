"use client";

import Link from "next/link";
import { Globe, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { DEMO_SCENARIOS, ROUTES } from "@/lib/constants";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";

export function AppHeader() {
  const {
    wallet,
    vault,
    toggleCluster,
    demoScenario,
    setDemoScenario,
  } = useEverKeepApp();

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
          <Select value={demoScenario} onValueChange={(v) => setDemoScenario(v as typeof demoScenario)}>
            <SelectTrigger className="hidden w-[180px] lg:flex">
              <SelectValue placeholder="Demo scenario" />
            </SelectTrigger>
            <SelectContent>
              {DEMO_SCENARIOS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleCluster}
            className="gap-2"
          >
            <Globe className="h-3.5 w-3.5" />
            <Badge
              variant={wallet.cluster === "devnet" ? "devnet" : "mainnet"}
              className="border-0 px-1.5 py-0"
            >
              {wallet.cluster === "devnet" && (
                <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-everkeep-cyan" />
              )}
              {wallet.cluster === "devnet" ? "Devnet" : "Mainnet"}
            </Badge>
          </Button>

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
