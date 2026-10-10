"use client";

import { useSearchParams } from "next/navigation";
import { BeneficiaryClaimPortal } from "./beneficiary-claim-portal";

export function ClaimPageClient() {
  const searchParams = useSearchParams();
  return <BeneficiaryClaimPortal initialAddress={searchParams.get("vault") ?? ""} />;
}
