import type { WalletMockState } from "@/types/wallet";

export const MOCK_WALLET_DISCONNECTED: WalletMockState = {
  status: "disconnected",
  publicKey: null,
  cluster: "devnet",
};

export const MOCK_WALLET_CONNECTED_OWNER: WalletMockState = {
  status: "connected",
  publicKey: "8FOwnerxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxK29",
  cluster: "devnet",
};

export const MOCK_WALLET_CONNECTED_BENEFICIARY: WalletMockState = {
  status: "connected",
  publicKey: "7xKBeneficiaryxxxxxxxxxxxxxxxxxxxxxxxxxx92A",
  cluster: "devnet",
};
