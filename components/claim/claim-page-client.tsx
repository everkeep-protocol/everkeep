"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { BeneficiaryClaimPortal } from "./beneficiary-claim-portal";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";

export function ClaimPageClient() {
  const searchParams = useSearchParams();
  const { lookupVaultForClaim } = useEverKeepApp();

  useEffect(() => {
    const vault = searchParams.get("vault");
    if (vault) lookupVaultForClaim(vault);
  }, [searchParams, lookupVaultForClaim]);

  return <BeneficiaryClaimPortal />;
}
