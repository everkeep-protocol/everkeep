export interface CreatePlanDraft {
  beneficiary: string;
  /** Selected preset, in seconds. */
  inactivityPeriodSeconds: number;
  customThresholdDays?: number;
  /** Token account address -> UI amount to approve for the vault PDA. */
  approvals: Record<string, string>;
}

export type InstructionName =
  | "initialize_vault"
  | "approve_checked"
  | "check_in"
  | "claim_delegated_tokens"
  | "cancel_vault"
  | "create_ata";

export interface PlannedInstruction {
  name: InstructionName;
  accountsSummary: string[];
  /** Rent or other lamports moved by this instruction, excluding signature fees. */
  estCostSol: number;
}

export type WizardMode = "create" | "approve";
