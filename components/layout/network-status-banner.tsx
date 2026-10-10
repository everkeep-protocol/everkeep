"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNetworkHealth } from "@/hooks/use-network-health";
import { CLUSTER_LABEL, SOLANA_CLUSTER, SOLANA_RPC_URL } from "@/lib/everkeep/config";
import { EVERKEEP_PROGRAM_ID } from "@/lib/everkeep/program";

export function NetworkStatusBanner() {
  const { health, recheck } = useNetworkHealth();
  if (health.status === "ok" || health.status === "checking") return null;

  const message =
    health.status === "wrong-cluster"
      ? `The RPC at ${SOLANA_RPC_URL} is not a ${CLUSTER_LABEL} node. Fix NEXT_PUBLIC_SOLANA_RPC_URL so it matches NEXT_PUBLIC_SOLANA_CLUSTER.`
      : health.status === "program-missing"
        ? SOLANA_CLUSTER === "localnet"
          ? `The EverKeep program ${EVERKEEP_PROGRAM_ID.toBase58()} is not loaded on the local validator. Start it with scripts/localnet-validator.sh.`
          : `The EverKeep program ${EVERKEEP_PROGRAM_ID.toBase58()} is not deployed on ${CLUSTER_LABEL} yet. Balances load, but vault transactions will fail until it is deployed.`
        : health.detail;

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10">
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-2.5 text-sm text-amber-200 md:px-6">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{message}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void recheck()}
          className="h-7 shrink-0 gap-1.5 px-2 text-amber-200 hover:text-amber-100"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Recheck
        </Button>
      </div>
    </div>
  );
}
