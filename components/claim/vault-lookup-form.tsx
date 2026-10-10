"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VaultLookupFormProps {
  /** Pre-filled (e.g. from ?vault=) and looked up once on mount. */
  initialAddress?: string;
  onLookup: (address: string) => Promise<boolean | null>;
  onNotFound: () => void;
}

export function VaultLookupForm({ initialAddress = "", onLookup, onNotFound }: VaultLookupFormProps) {
  const [address, setAddress] = useState(initialAddress);
  const [loading, setLoading] = useState(false);
  const autoLookedUp = useRef(false);

  const lookup = useCallback(
    async (value: string) => {
      setLoading(true);
      try {
        if ((await onLookup(value)) === false) onNotFound();
      } finally {
        setLoading(false);
      }
    },
    [onLookup, onNotFound],
  );

  useEffect(() => {
    if (autoLookedUp.current || !initialAddress.trim()) return;
    autoLookedUp.current = true;
    setAddress(initialAddress);
    void lookup(initialAddress);
  }, [initialAddress, lookup]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void lookup(address);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="vaultPda">Vault PDA or owner wallet address</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="vaultPda"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Paste the vault PDA shared by the owner"
            className="font-mono text-xs"
          />
          <Button
            type="submit"
            variant="outline"
            className="gap-2"
            disabled={loading || !address.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Inspect vault
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          An owner address resolves to that owner&apos;s active vault through
          its registry PDA.
        </p>
      </div>
    </form>
  );
}
