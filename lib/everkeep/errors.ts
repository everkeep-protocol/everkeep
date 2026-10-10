import { AnchorError } from "@anchor-lang/core";
import { WalletError } from "@solana/wallet-adapter-base";
import { CLUSTER_LABEL, SOLANA_CLUSTER, SOLANA_RPC_URL, SOL_FAUCET_HINT } from "./config";
import { EVERKEEP_IDL } from "./program";

const PROGRAM_ERRORS = new Map(EVERKEEP_IDL.errors.map((e) => [e.code, e.msg]));

/** SPL Token / Token-2022 error codes users can actually hit through EverKeep. */
const TOKEN_ERRORS = new Map<number, string>([
  [0x1, "The token account does not hold enough tokens for this transfer."],
  [0x4, "The token account is not owned by the expected wallet."],
  [0x11, "The token account is frozen by the token issuer."],
]);

const TOKEN_PROGRAM_FAILURE =
  /Program (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA|TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb) failed/;

function logsOf(err: unknown): string[] {
  const e = err as { logs?: unknown; transactionLogs?: unknown };
  const logs = e?.logs ?? e?.transactionLogs;
  return Array.isArray(logs) ? (logs as string[]) : [];
}

function describeWalletError(err: WalletError): string {
  const msg = err.message || err.error?.message || "";
  const code = (err.error as { code?: number } | undefined)?.code;
  if (code === 4001 || /reject|declin|cancel|denied/i.test(msg)) {
    return "The request was rejected in the wallet.";
  }
  switch (err.name) {
    case "WalletNotReadyError":
      return "Phantom is not installed or not ready. Install or unlock Phantom and reload the page.";
    case "WalletTimeoutError":
      return "Phantom did not respond in time. Open the extension and try again.";
    case "WalletConnectionError":
      return `Could not connect to Phantom${msg ? `: ${msg}` : "."} Unlock Phantom and try again.`;
    case "WalletDisconnectedError":
    case "WalletNotConnectedError":
      return "The wallet disconnected. Reconnect Phantom and try again.";
    case "WalletSignTransactionError":
      return `Phantom could not sign the transaction${msg ? `: ${msg}` : "."}`;
    default:
      return msg || err.name;
  }
}

/** Human-readable reason for a failed wallet, RPC, or transaction call. */
export function describeTxError(err: unknown): string {
  if (err instanceof WalletError) return describeWalletError(err);

  const logs = logsOf(err);
  const anchorError = logs.length > 0 ? AnchorError.parse(logs) : null;
  if (anchorError) return anchorError.error.errorMessage;
  if (err instanceof AnchorError) return err.error.errorMessage;

  const message = err instanceof Error ? err.message : String(err);
  const joined = `${message}\n${logs.join("\n")}`;

  // Preflight logs use hex; failed confirmations report {"Custom":6005}.
  const customHex = /custom program error: 0x([0-9a-f]+)/i.exec(joined);
  const customDec = /"Custom":(\d+)/.exec(joined);
  if (customHex || customDec) {
    const code = customHex ? parseInt(customHex[1], 16) : Number(customDec![1]);
    const known = PROGRAM_ERRORS.get(code);
    if (known) return known;
    if (TOKEN_PROGRAM_FAILURE.test(joined) && TOKEN_ERRORS.has(code)) return TOKEN_ERRORS.get(code)!;
  }
  if (/no record of a prior credit|insufficient lamports|insufficient funds for (rent|fee)/i.test(joined)) {
    return `The connected wallet does not have enough SOL on ${CLUSTER_LABEL} for fees and rent. ${SOL_FAUCET_HINT}`.trim();
  }
  if (/program that does not exist|ProgramAccountNotFound|Unsupported program id/i.test(joined)) {
    return SOLANA_CLUSTER === "localnet"
      ? `The EverKeep program is not loaded on ${SOLANA_RPC_URL}. Start the local validator with the program.`
      : `The EverKeep program is not deployed on ${CLUSTER_LABEL} yet.`;
  }
  if (/block ?height exceeded|was not confirmed in|TransactionExpired/i.test(joined)) {
    return "The transaction was not confirmed in time. It may still land — refresh in a few seconds and check the explorer before retrying.";
  }
  if (/Blockhash not found/i.test(joined)) {
    return "The transaction's blockhash expired before it reached the network, usually because the wallet approval took over a minute. Please try again and approve promptly.";
  }
  if (/429|Too Many Requests|rate limit/i.test(joined)) {
    return `The ${CLUSTER_LABEL} RPC is rate-limiting requests. Wait a moment and retry, or set NEXT_PUBLIC_SOLANA_RPC_URL to a dedicated endpoint.`;
  }
  if (/Failed to fetch|fetch failed|ECONNREFUSED|NetworkError/i.test(joined)) {
    return SOLANA_CLUSTER === "localnet"
      ? `Cannot reach the Solana RPC at ${SOLANA_RPC_URL}. Is the local validator running?`
      : `Cannot reach the ${CLUSTER_LABEL} RPC at ${SOLANA_RPC_URL}. Check your connection and retry.`;
  }
  return message;
}
