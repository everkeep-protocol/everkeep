import type { NetworkCluster } from "@/types/wallet";

const CLUSTERS: NetworkCluster[] = ["localnet", "devnet", "mainnet"];

function readCluster(): NetworkCluster {
  const value = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";
  if (!CLUSTERS.includes(value as NetworkCluster)) {
    throw new Error(
      `NEXT_PUBLIC_SOLANA_CLUSTER must be one of ${CLUSTERS.join(", ")}; got "${value}"`,
    );
  }
  return value as NetworkCluster;
}

export const SOLANA_CLUSTER = readCluster();

const DEFAULT_RPC_URLS: Record<NetworkCluster, string> = {
  localnet: "http://127.0.0.1:8899",
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
};

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || DEFAULT_RPC_URLS[SOLANA_CLUSTER];

/** Genesis hashes used to confirm the RPC actually serves the configured cluster. */
export const CLUSTER_GENESIS_HASH: Partial<Record<NetworkCluster, string>> = {
  devnet: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
  mainnet: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
};

export const CLUSTER_LABELS: Record<NetworkCluster, string> = {
  localnet: "Localnet",
  devnet: "Devnet",
  mainnet: "Mainnet",
};

export const CLUSTER_LABEL = CLUSTER_LABELS[SOLANA_CLUSTER];

export const SOL_FAUCET_HINT =
  SOLANA_CLUSTER === "devnet"
    ? "Get Devnet SOL from https://faucet.solana.com."
    : SOLANA_CLUSTER === "localnet"
      ? "Run npm run fund:localnet -- <address>."
      : "";

export function explorerTxUrl(signature: string): string {
  return explorerUrl(`tx/${signature}`);
}

export function explorerAddressUrl(address: string): string {
  return explorerUrl(`address/${address}`);
}

function explorerUrl(path: string): string {
  const base = `https://explorer.solana.com/${path}`;
  if (SOLANA_CLUSTER === "mainnet") return base;
  if (SOLANA_CLUSTER === "devnet") return `${base}?cluster=devnet`;
  return `${base}?cluster=custom&customUrl=${encodeURIComponent(SOLANA_RPC_URL)}`;
}
