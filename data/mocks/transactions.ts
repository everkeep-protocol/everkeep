import type { SimulatedInstruction } from "@/types/wizard";

export const MOCK_TX_CREATE_PLAN: SimulatedInstruction[] = [
  {
    name: "initialize",
    accountsSummary: ["Owner", "Vault PDA", "System Program"],
    estFeeSol: 0.002,
  },
  {
    name: "deposit",
    accountsSummary: ["Owner", "Vault PDA", "Owner SOL ATA"],
    estFeeSol: 0.00005,
  },
];

export const MOCK_TX_UPDATE_PLAN: SimulatedInstruction[] = [
  {
    name: "update_plan",
    accountsSummary: ["Owner", "Vault PDA"],
    estFeeSol: 0.0001,
  },
];

export const MOCK_TX_DEPOSIT_ONLY: SimulatedInstruction[] = [
  {
    name: "deposit",
    accountsSummary: ["Owner", "Vault PDA", "Owner SOL ATA"],
    estFeeSol: 0.00005,
  },
];

export const MOCK_TX_CHECK_IN: SimulatedInstruction[] = [
  {
    name: "check_in",
    accountsSummary: ["Owner", "Vault PDA"],
    estFeeSol: 0.000005,
  },
];

export const MOCK_TX_CANCEL: SimulatedInstruction[] = [
  {
    name: "cancel",
    accountsSummary: ["Owner", "Vault PDA", "Owner SOL ATA"],
    estFeeSol: 0.0001,
  },
];

export const MOCK_TX_CLAIM: SimulatedInstruction[] = [
  {
    name: "claim",
    accountsSummary: ["Beneficiary", "Vault PDA", "Beneficiary SOL ATA"],
    estFeeSol: 0.0001,
  },
];
