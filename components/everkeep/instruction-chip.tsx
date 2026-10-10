import { Fragment } from "react";
import type { InstructionName } from "@/types/wizard";
import { cn } from "@/lib/utils";

const labels: Record<InstructionName, string> = {
  initialize_vault: "initialize_vault()",
  approve_checked: "spl_token::approve_checked()",
  check_in: "check_in()",
  claim_delegated_tokens: "claim_delegated_tokens()",
  cancel_vault: "cancel_vault()",
  create_ata: "ata::create_idempotent()",
};

/** Splits after "::" and "_" so long identifiers wrap at readable points in narrow cards. */
function withBreakPoints(label: string) {
  return label.split(/(::|_)/).map((part, i) => (
    <Fragment key={i}>
      {part}
      {(part === "::" || part === "_") && <wbr />}
    </Fragment>
  ));
}

export function InstructionChip({
  name,
  className,
}: {
  name: InstructionName;
  className?: string;
}) {
  return (
    <code
      className={cn(
        "inline-block max-w-full rounded-md border border-everkeep-violet/30 bg-everkeep-violet/10 px-2 py-0.5 font-mono text-xs leading-5 text-everkeep-violet [overflow-wrap:anywhere]",
        className,
      )}
      title={labels[name]}
    >
      {withBreakPoints(labels[name])}
    </code>
  );
}
