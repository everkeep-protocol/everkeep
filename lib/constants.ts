export const INACTIVITY_PRESETS = [30, 90, 180] as const;

export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  claim: "/claim",
} as const;

export type DemoScenarioId =
  | "landing"
  | "owner-active"
  | "owner-warning"
  | "beneficiary-claim";

export const DEMO_SCENARIOS: { id: DemoScenarioId; label: string }[] = [
  { id: "landing", label: "Landing (disconnected)" },
  { id: "owner-active", label: "Owner — active vault" },
  { id: "owner-warning", label: "Owner — deadline warning" },
  { id: "beneficiary-claim", label: "Beneficiary — claimable" },
];
