"use client";

import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { truncateAddress } from "@/lib/validators";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";
import { useClipboard } from "@/hooks/use-clipboard";

export function ConnectWalletButton() {
  const { wallet, phantomInstalled, connectWallet, disconnectWallet } =
    useEverKeepApp();
  const { copy } = useClipboard();

  if (wallet.status === "connecting") {
    return (
      <Button disabled className="min-w-[140px]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Connecting…
      </Button>
    );
  }

  if (wallet.status === "connected" && wallet.publicKey) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 font-mono">
            <span className="h-2 w-2 rounded-full bg-everkeep-emerald shadow-glow-sm" />
            {truncateAddress(wallet.publicKey, 2)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => copy(wallet.publicKey!)}>
            Copy address
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={disconnectWallet}>
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={connectWallet} className="gap-2">
      <Wallet className="h-4 w-4" />
      {phantomInstalled ? "Connect Wallet" : "Install Phantom"}
    </Button>
  );
}
