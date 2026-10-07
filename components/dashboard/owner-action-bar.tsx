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
import { useToast } from "@/hooks/use-toast";
import { useEverKeepApp } from "@/providers/everkeep-app-provider";

export function OwnerActionBar() {
  const { checkIn, openWizard, cancelPlan } = useEverKeepApp();
  const { toast } = useToast();
  const [checkingIn, setCheckingIn] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const onCheckIn = async () => {
    setCheckingIn(true);
    try {
      await checkIn();
      toast({
        title: "Check-in recorded",
        description: "Last activity timestamp updated on-chain (simulated).",
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const onCancel = async () => {
    setCancelling(true);
    try {
      await cancelPlan();
      setCancelOpen(false);
      toast({
        title: "Plan cancelled",
        description: "Vault closed and assets returned (simulated).",
      });
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
          onClick={() => openWizard("update")}
        >
          <Pencil className="h-4 w-4" />
          Edit / Update Plan
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => openWizard("deposit-only")}
        >
          <ArrowDownToLine className="h-4 w-4" />
          Deposit Assets
        </Button>
        <Button
          variant="destructive"
          className="w-full gap-2"
          onClick={() => setCancelOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Cancel & Withdraw
        </Button>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel inheritance plan?</DialogTitle>
            <DialogDescription>
              This will close your vault and withdraw protected assets back to
              your wallet. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
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
