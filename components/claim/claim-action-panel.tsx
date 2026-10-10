"use client";

import { useState } from "react";
import { Gift, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TxReviewPanel } from "@/components/wizard/tx-review-panel";
import { useCountdown } from "@/hooks/use-countdown";
import { MAX_TOKEN_IXS_PER_TX } from "@/lib/everkeep/instructions";
import { tokenProgramLabel } from "@/lib/everkeep/tokens";
import { tokenLabel } from "@/lib/everkeep/vault";
import { truncateAddress } from "@/lib/validators";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";
import type { VaultViewModel } from "@/types/vault";
import type { PlannedInstruction } from "@/types/wizard";

export function ClaimActionPanel({ vault }: { vault: VaultViewModel }) {
  const { wallet, phantomInstalled, claimAssets, connectWallet, disconnectWallet } =
    useEverKeepApp();
  const [claiming, setClaiming] = useState(false);
  const { expired } = useCountdown(vault.claimEligibleAt);

  const isBeneficiary =
    wallet.status === "connected" && wallet.publicKey === vault.beneficiary;
  const claimableDelegations = vault.delegations.filter((d) => d.claimable > BigInt(0));

  const instructions: PlannedInstruction[] = claimableDelegations.flatMap((d) => [
    {
      name: "create_ata" as const,
      accountsSummary: ["Beneficiary", `${tokenLabel(d)} (${tokenProgramLabel(d.programId)})`],
      estCostSol: 0,
    },
    {
      name: "claim_delegated_tokens" as const,
      accountsSummary: [
        "Beneficiary",
        "Vault PDA",
        `Owner token account ${truncateAddress(d.tokenAccount, 4)}`,
        "Beneficiary ATA",
      ],
      estCostSol: 0,
    },
  ]);

  const onClaim = async () => {
    setClaiming(true);
    try {
      await claimAssets();
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-4">
      {instructions.length > 0 && (
        <TxReviewPanel
          instructions={instructions}
          transactions={Math.ceil(claimableDelegations.length / MAX_TOKEN_IXS_PER_TX)}
        />
      )}
      {wallet.status !== "connected" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            Connect the beneficiary wallet to execute claim_delegated_tokens().
          </p>
          <Button
            variant="outline"
            disabled={wallet.status === "connecting"}
            onClick={connectWallet}
            className="gap-2"
          >
            {wallet.status === "connecting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {phantomInstalled ? "Connect beneficiary wallet" : "Install Phantom"}
          </Button>
        </div>
      ) : !isBeneficiary ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-200/90">
            Connected wallet ({truncateAddress(wallet.publicKey!, 4)}) does not
            match the plan beneficiary. Switch accounts in Phantom.
          </p>
          <Button variant="outline" onClick={disconnectWallet}>
            Disconnect
          </Button>
        </div>
      ) : expired && claimableDelegations.length === 0 ? (
        <p className="text-sm text-everkeep-emerald">
          Nothing is claimable: every allowance has been claimed, revoked, or
          spent by the owner.
        </p>
      ) : (
        <Button
          className="w-full gap-2"
          disabled={!expired || claiming || claimableDelegations.length === 0}
          onClick={onClaim}
        >
          {claiming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Gift className="h-4 w-4" />
          )}
          {expired ? "Execute claim()" : "Claim unlocks after the inactivity period"}
        </Button>
      )}
    </div>
  );
}
