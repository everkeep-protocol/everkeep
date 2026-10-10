#!/usr/bin/env bash
# Starts a local validator with the already-built EverKeep program preloaded at
# its declared Program ID. Nothing is deployed to devnet or mainnet.
#
# Run inside WSL:  bash scripts/localnet-validator.sh
set -euo pipefail

export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

CONTRACT_DIR="${EVERKEEP_CONTRACT_DIR:-$HOME/projects/everkeep-contract}"
LEDGER_DIR="${EVERKEEP_LEDGER_DIR:-/tmp/everkeep-ledger}"
FRONTEND_IDL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/everkeep/idl/everkeep_contract.json"

SO="$CONTRACT_DIR/target/deploy/everkeep_contract.so"
KEYPAIR="$CONTRACT_DIR/target/deploy/everkeep_contract-keypair.json"

for f in "$SO" "$KEYPAIR" "$FRONTEND_IDL"; do
  [[ -f "$f" ]] || { echo "missing $f (run anchor build / npm run sync-idl)" >&2; exit 1; }
done

PROGRAM_ID="$(solana address -k "$KEYPAIR")"
IDL_ID="$(sed -n 's/^ *"address": *"\([^"]*\)".*/\1/p' "$FRONTEND_IDL" | head -1)"

if [[ "$PROGRAM_ID" != "$IDL_ID" ]]; then
  echo "Program ID mismatch: keypair=$PROGRAM_ID frontend IDL=$IDL_ID. Run npm run sync-idl." >&2
  exit 1
fi

echo "Loading everkeep_contract at $PROGRAM_ID"
exec solana-test-validator \
  --reset \
  --ledger "$LEDGER_DIR" \
  --bpf-program "$PROGRAM_ID" "$SO"
