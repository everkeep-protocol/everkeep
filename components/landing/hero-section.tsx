"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";

export function HeroSection() {
  const router = useRouter();
  const { wallet, connectWallet, openWizard, vault } = useEverKeepApp();

  const handleCta = () => {
    if (wallet.status !== "connected") {
      connectWallet();
      return;
    }
    if (vault) {
      router.push(ROUTES.dashboard);
      return;
    }
    openWizard("create");
  };

  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-everkeep-cyan">
          Solana Program · PDA Vault
        </p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          <span className="text-gradient-emerald">
            Decentralized Digital Inheritance
          </span>
          <span className="mt-2 block text-foreground"> on Solana</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Define beneficiaries and inactivity rules on-chain. EverKeep enforces
          programmable continuity—non-custodial, trustless, and Solana-native.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            onClick={handleCta}
            disabled={wallet.status === "connecting"}
            className="gap-2"
          >
            {wallet.status === "connecting"
              ? "Connecting…"
              : wallet.status === "connected"
                ? vault
                  ? "Manage Vault"
                  : "Create Vault"
                : "Connect Wallet to Create Vault"}
            {wallet.status === "connecting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </Button>
          {wallet.status === "connected" && vault && (
            <Button size="lg" variant="outline" asChild>
              <Link href={ROUTES.claim}>Beneficiary Claim Portal</Link>
            </Button>
          )}
          {wallet.status !== "connected" && (
            <Button size="lg" variant="outline" asChild>
              <Link href={ROUTES.claim}>I&apos;m a Beneficiary</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
