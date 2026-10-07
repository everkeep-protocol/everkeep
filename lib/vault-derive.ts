import type { InheritancePlanMock, VaultViewModel } from "@/types/vault";
import { lamportsToSol } from "./format";

const MS_PER_DAY = 86_400_000;
const WARNING_DAYS = 7;

export function deriveVaultViewModel(
  plan: InheritancePlanMock,
  now = new Date(),
): VaultViewModel {
  const last = new Date(plan.lastCheckInAt).getTime();
  const deadline = new Date(last + plan.inactivityThresholdDays * MS_PER_DAY);
  const deadlineIso = deadline.toISOString();
  const nowMs = now.getTime();

  let conditionStatus: VaultViewModel["conditionStatus"] = "active";
  if (nowMs >= deadline.getTime()) {
    conditionStatus = "claimable";
  } else {
    const daysLeft = (deadline.getTime() - nowMs) / MS_PER_DAY;
    if (daysLeft <= WARNING_DAYS) conditionStatus = "warning";
  }

  const splPart =
    plan.assets.spl.length > 0
      ? ` + ${plan.assets.spl.map((t) => t.symbol).join(", ")}`
      : "";

  return {
    ...plan,
    conditionStatus,
    nextCheckInDeadlineAt: deadlineIso,
    claimEligibleAt: deadlineIso,
    totalProtectedDisplay: lamportsToSol(plan.assets.solLamports) + splPart,
  };
}
