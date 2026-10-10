import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import type { NetworkCluster } from "@/types/wallet";

export interface KnownToken {
  symbol: string;
  name: string;
  mint: PublicKey;
  programId: PublicKey;
  decimals: number;
}

// Devnet mints: PYUSD per docs.paxos.com/guides/stablecoin/pyusd/testnet,
// USDC per developers.circle.com/stablecoins/usdc-contract-addresses.
// Owner program and decimals are verified on-chain by `npm run check:devnet`.
export const KNOWN_TOKENS: Record<NetworkCluster, KnownToken[]> = {
  localnet: [],
  devnet: [
    {
      symbol: "PYUSD",
      name: "PayPal USD",
      mint: new PublicKey("CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM"),
      programId: TOKEN_2022_PROGRAM_ID,
      decimals: 6,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
      programId: TOKEN_PROGRAM_ID,
      decimals: 6,
    },
  ],
  mainnet: [],
};

export function findKnownToken(
  cluster: NetworkCluster,
  mint: PublicKey,
): KnownToken | undefined {
  return KNOWN_TOKENS[cluster].find((t) => t.mint.equals(mint));
}
