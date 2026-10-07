export interface CreatePlanDraft {
  beneficiary: string;
  inactivityThresholdDays: number;
  customThresholdDays?: number;
  depositSol: number;
  depositSplMints: string[];
}

export type InstructionName =
  | "initialize"
  | "deposit"
  | "check_in"
  | "update_plan"
  | "cancel"
  | "claim";

export interface SimulatedInstruction {
  name: InstructionName;
  accountsSummary: string[];
  estFeeSol: number;
}

export type WizardMode = "create" | "update" | "deposit-only";
