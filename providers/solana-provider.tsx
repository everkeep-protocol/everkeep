"use client";

import { useCallback, useMemo } from "react";
import type { WalletError } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { toast } from "@/hooks/use-toast";
import { SOLANA_RPC_URL } from "@/lib/everkeep/config";
import { describeTxError } from "@/lib/everkeep/errors";

const TX_ERROR_NAMES = new Set([
  "WalletSignTransactionError",
  "WalletSendTransactionError",
  "WalletSignMessageError",
  "WalletSignInError",
]);

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  // Phantom signs only; the app submits through SOLANA_RPC_URL, so the
  // cluster is decided by the app config rather than Phantom's network.
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  const onError = useCallback((error: WalletError) => {
    console.warn("[wallet]", error);
    // Not-installed is handled by the connect button; signing errors are
    // reported by the action that requested the signature.
    if (error.name === "WalletNotReadyError" || TX_ERROR_NAMES.has(error.name)) return;
    toast({ variant: "destructive", title: "Wallet error", description: describeTxError(error) });
  }, []);

  return (
    <ConnectionProvider endpoint={SOLANA_RPC_URL} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
