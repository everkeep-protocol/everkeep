"use client";

import { useState } from "react";
import { Gift, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TxReviewPanel } from "@/components/wizard/tx-review-panel";
import { MOCK_TX_CLAIM } from "@/data/mocks/transactions";
import { useToast } from "@/hooks/use-toast";
import { truncateAddress } from "@/lib/validators";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";
import type { VaultViewModel } from "@/types/vault";

export function ClaimActionPanel({ vault }: { vault: VaultViewModel }) {
  const { wallet, claimAssets, connectWallet, disconnectWallet } =
    useEverKeepApp();
  const { toast } = useToast();
  const [claiming, setClaiming] = useState(false);

  const isBeneficiary =
    wallet.status === "connected" &&
    wallet.publicKey === vault.beneficiary;
  const claimable =
    vault.conditionStatus === "claimable" && vault.status !== "claimed";
  const claimed = vault.status === "claimed";

  const onClaim = async () => {
    setClaiming(true);
    try {
      await claimAssets();
      toast({
        title: "Inheritance claimed",
        description: "Assets transferred to beneficiary (simulated).",
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-4">
      <TxReviewPanel instructions={MOCK_TX_CLAIM} />
      {wallet.status !== "connected" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Connect the beneficiary wallet to execute claim().
          </p>
          <Button
            variant="outline"
            disabled={wallet.status === "connecting"}
            onClick={() => connectWallet("beneficiary")}
            className="gap-2"
          >
            {wallet.status === "connecting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            Connect as beneficiary
          </Button>
        </div>
      ) : !isBeneficiary ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-200/90">
            Connected wallet ({truncateAddress(wallet.publicKey!, 4)}) does not
            match the plan beneficiary.
          </p>
          <Button variant="outline" onClick={disconnectWallet}>
            Switch wallet
          </Button>
        </div>
      ) : claimed ? (
        <p className="text-sm text-everkeep-emerald">
          This vault has already been claimed.
        </p>
      ) : (
        <Button
          className="w-full gap-2"
          disabled={!claimable || claiming}
          onClick={onClaim}
        >
          {claiming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Gift className="h-4 w-4" />
          )}
          Execute claim()
        </Button>
      )}
    </div>
  );
}
