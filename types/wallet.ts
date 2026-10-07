export type NetworkCluster = "devnet" | "mainnet";

export type WalletConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected";

export type WalletRole = "owner" | "beneficiary";

export interface WalletMockState {
  status: WalletConnectionStatus;
  publicKey: string | null;
  cluster: NetworkCluster;
}
