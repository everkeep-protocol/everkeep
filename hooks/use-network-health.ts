"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { CLUSTER_GENESIS_HASH, SOLANA_CLUSTER } from "@/lib/everkeep/config";
import { describeTxError } from "@/lib/everkeep/errors";
import { EVERKEEP_PROGRAM_ID } from "@/lib/everkeep/program";

export type NetworkHealth =
  | { status: "checking" }
  | { status: "ok" }
  | { status: "rpc-error"; detail: string }
  | { status: "wrong-cluster"; genesisHash: string }
  | { status: "program-missing" };

/** Verifies the RPC serves the configured cluster and that the EverKeep program exists there. */
export function useNetworkHealth() {
  const { connection } = useConnection();
  const [health, setHealth] = useState<NetworkHealth>({ status: "checking" });

  const check = useCallback(async () => {
    setHealth({ status: "checking" });
    try {
      const expected = CLUSTER_GENESIS_HASH[SOLANA_CLUSTER];
      if (expected) {
        const genesisHash = await connection.getGenesisHash();
        if (genesisHash !== expected) {
          setHealth({ status: "wrong-cluster", genesisHash });
          return;
        }
      }
      const program = await connection.getAccountInfo(EVERKEEP_PROGRAM_ID, "confirmed");
      setHealth(program?.executable ? { status: "ok" } : { status: "program-missing" });
    } catch (err) {
      setHealth({ status: "rpc-error", detail: describeTxError(err) });
    }
  }, [connection]);

  useEffect(() => {
    void check();
  }, [check]);

  return { health, recheck: check };
}
