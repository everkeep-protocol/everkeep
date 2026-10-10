"use client";

import { useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";

export function OwnerActionBar() {
  const { checkIn, openWizard, cancelPlan, vault } = useEverKeepApp();
  const [checkingIn, setCheckingIn] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const delegationCount = vault?.delegations.length ?? 0;

  const onCheckIn = async () => {
    setCheckingIn(true);
    try {
      await checkIn();
    } finally {
      setCheckingIn(false);
    }
  };

  const onCancel = async () => {
    setCancelling(true);
    try {
      if (await cancelPlan()) setCancelOpen(false);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <div className="glass-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button
          onClick={onCheckIn}
          disabled={checkingIn}
          className="w-full gap-2"
        >
          {checkingIn ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Activity className="h-4 w-4" />
          )}
          Check-In Now
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          disabled
        >
          <Pencil className="h-4 w-4" />
          Edit / Update Plan
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => openWizard("approve")}
        >
          <ArrowDownToLine className="h-4 w-4" />
          Approve SPL Tokens
        </Button>
        <Button
          variant="destructive"
          className="w-full gap-2"
          onClick={() => setCancelOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Cancel Vault
        </Button>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Editing is unavailable: the program has no update instruction. Cancel
        and create a new vault to change the beneficiary or period.
      </p>

      <Dialog open={cancelOpen} onOpenChange={(o) => !cancelling && setCancelOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel inheritance plan?</DialogTitle>
            <DialogDescription>
              This revokes the vault&apos;s delegation on {delegationCount} token
              account{delegationCount === 1 ? "" : "s"} and closes the vault,
              refunding its rent to you. Your tokens never left your wallet.
              This cannot be undone; a new vault will get a new address.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelling}
            >
              Keep plan
            </Button>
            <Button
              variant="destructive"
              onClick={onCancel}
              disabled={cancelling}
            >
              {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
