"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MOCK_VAULT_ACTIVE } from "@/data/mocks/vault-active";
import { MOCK_VAULT_CLAIMABLE } from "@/data/mocks/vault-claimable";
import { truncateAddress } from "@/lib/validators";

interface VaultLookupFormProps {
  onLookup: (pda: string) => boolean;
  onError: () => void;
}

const DEMO_VAULTS = [
  { label: "Condition met", pda: MOCK_VAULT_CLAIMABLE.vaultPda },
  { label: "Still active", pda: MOCK_VAULT_ACTIVE.vaultPda },
];

export function VaultLookupForm({ onLookup, onError }: VaultLookupFormProps) {
  const [pda, setPda] = useState("");

  const submit = (value: string) => {
    if (!onLookup(value)) onError();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(pda);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="vaultPda">Vault PDA address</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="vaultPda"
            value={pda}
            onChange={(e) => setPda(e.target.value)}
            placeholder="Paste the vault PDA shared by the owner"
            className="font-mono text-xs"
          />
          <Button type="submit" variant="outline" className="gap-2">
            <Search className="h-4 w-4" />
            Inspect vault
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Demo vaults:</span>
        {DEMO_VAULTS.map((v) => (
          <button
            key={v.pda}
            type="button"
            onClick={() => {
              setPda(v.pda);
              submit(v.pda);
            }}
            className="rounded-full border border-white/10 px-2.5 py-1 font-mono transition-colors hover:border-everkeep-emerald/40 hover:text-everkeep-emerald"
          >
            {truncateAddress(v.pda, 4)} · {v.label}
          </button>
        ))}
      </div>
    </form>
  );
}
