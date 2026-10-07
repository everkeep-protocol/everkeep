"use client";

import { Loader2, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";
import { OwnerActionBar } from "./owner-action-bar";
import { VaultOverviewCard } from "./vault-overview-card";

export function OwnerDashboard() {
  const { vault, openWizard, wallet, connectWallet, setDemoScenario } =
    useEverKeepApp();

  if (wallet.status !== "connected") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect your wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            Connect a Solana wallet to view and manage your inheritance vault.
          </p>
          <Button
            onClick={() => connectWallet()}
            disabled={wallet.status === "connecting"}
            className="gap-2"
          >
            {wallet.status === "connecting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {wallet.status === "connecting" ? "Connecting…" : "Connect Wallet"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!vault) {
    return (
      <Card className="glass-card-active text-center">
        <CardHeader>
          <CardTitle>No active inheritance plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Create a vault, deposit assets, and set inactivity rules for your
            beneficiary.
          </p>
          <Button onClick={() => openWizard("create")} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Inheritance Plan
          </Button>
          <p className="text-xs text-muted-foreground">
            Or{" "}
            <button
              type="button"
              onClick={() => setDemoScenario("owner-active")}
              className="text-everkeep-cyan hover:underline"
            >
              load the demo vault
            </button>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Owner Dashboard
        </h1>
        <p className="text-muted-foreground">
          Monitor your vault, check in, and manage your inheritance plan.
        </p>
      </div>
      <VaultOverviewCard vault={vault} />
      <OwnerActionBar />
    </div>
  );
}
