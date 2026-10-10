export type NetworkCluster = "localnet" | "devnet" | "mainnet";

export type WalletConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected";

export interface WalletState {
  status: WalletConnectionStatus;
  publicKey: string | null;
  cluster: NetworkCluster;
}
