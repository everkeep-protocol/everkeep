// Read-only Devnet diagnostics: program deployment status, known mint
// verification, and (optionally) a wallet's SOL / token balances.
// Sends no transactions.
//
// Usage: npm run check:devnet -- [WALLET_ADDRESS]

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  ExtensionType,
  getDefaultAccountState,
  getExtensionTypes,
  getPermanentDelegate,
  getTransferFeeConfig,
  getTransferHook,
  unpackMint,
} from "@solana/spl-token";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import idl from "../lib/everkeep/idl/everkeep_contract.json";
import { KNOWN_TOKENS } from "../lib/everkeep/known-tokens";
import {
  fetchOwnerTokenAccounts,
  formatTokenAmount,
  tokenProgramLabel,
} from "../lib/everkeep/tokens";

const RPC_URL = process.env.DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
const CONTRACT_DIR =
  process.env.EVERKEEP_CONTRACT_DIR ??
  "\\\\wsl.localhost\\Ubuntu\\home\\mariab\\projects\\everkeep-contract";
const PROGRAM_ID = new PublicKey(idl.address);
const BPF_LOADER_UPGRADEABLE_PROGRAM_ID = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const connection = new Connection(RPC_URL, "confirmed");

async function checkProgram() {
  console.log(`\n== Program ${PROGRAM_ID.toBase58()} on ${RPC_URL}`);
  const info = await connection.getAccountInfo(PROGRAM_ID);
  if (!info) {
    console.log("NOT DEPLOYED: no account at the program ID on Devnet.");
    return;
  }
  console.log(`executable=${info.executable} owner=${info.owner.toBase58()}`);
  if (!info.owner.equals(BPF_LOADER_UPGRADEABLE_PROGRAM_ID)) return;

  const programData = new PublicKey(info.data.subarray(4, 36));
  const pd = await connection.getAccountInfo(programData);
  if (!pd) {
    console.log("program data account missing (program closed?)");
    return;
  }
  const slot = pd.data.readBigUInt64LE(4);
  const authority = pd.data[12] === 1 ? new PublicKey(pd.data.subarray(13, 45)).toBase58() : "none (immutable)";
  console.log(`deployed at slot ${slot}, upgrade authority ${authority}`);

  const soPath = `${CONTRACT_DIR}\\target\\deploy\\everkeep_contract.so`;
  if (existsSync(soPath)) {
    const local = readFileSync(soPath);
    const onChain = pd.data.subarray(45, 45 + local.length);
    const same = createHash("sha256").update(local).digest("hex") ===
      createHash("sha256").update(onChain).digest("hex");
    console.log(`on-chain binary ${same ? "MATCHES" : "DIFFERS FROM"} local target/deploy/everkeep_contract.so`);
  }
}

async function checkMints() {
  for (const token of KNOWN_TOKENS.devnet) {
    console.log(`\n== ${token.symbol} mint ${token.mint.toBase58()}`);
    const info = await connection.getAccountInfo(token.mint);
    if (!info) {
      console.log("NOT FOUND on Devnet");
      continue;
    }
    const ownerOk = info.owner.equals(token.programId);
    console.log(`owner program ${info.owner.toBase58()} ${ownerOk ? "(expected)" : "(UNEXPECTED)"}`);
    if (!ownerOk) continue;
    const mint = unpackMint(token.mint, info, token.programId);
    console.log(`decimals ${mint.decimals} ${mint.decimals === token.decimals ? "(expected)" : "(UNEXPECTED)"}, initialized=${mint.isInitialized}`);
    const exts = getExtensionTypes(mint.tlvData);
    if (exts.length === 0) continue;
    console.log(`extensions: ${exts.map((e) => ExtensionType[e] || `#${e}`).join(", ")}`);
    const hook = getTransferHook(mint);
    if (hook) console.log(`transfer hook program: ${hook.programId.equals(PublicKey.default) ? "none" : hook.programId.toBase58()}`);
    const fee = getTransferFeeConfig(mint);
    if (fee) console.log(`transfer fee (current): ${fee.newerTransferFee.transferFeeBasisPoints} bps`);
    const state = getDefaultAccountState(mint);
    if (state) console.log(`default account state: ${state.state === 1 ? "initialized" : state.state === 2 ? "FROZEN" : state.state}`);
    const pdel = getPermanentDelegate(mint);
    if (pdel) console.log(`permanent delegate: ${pdel.delegate.toBase58()}`);
  }
}

async function checkWallet(address: string) {
  const owner = new PublicKey(address);
  console.log(`\n== Wallet ${owner.toBase58()}`);
  console.log(`SOL: ${(await connection.getBalance(owner)) / LAMPORTS_PER_SOL}`);
  const accounts = await fetchOwnerTokenAccounts(connection, owner);
  if (accounts.length === 0) console.log("no SPL Token / Token-2022 accounts");
  for (const a of accounts) {
    const known = KNOWN_TOKENS.devnet.find((t) => t.mint.equals(a.mint));
    console.log(
      `${known?.symbol ?? "unknown"} [${tokenProgramLabel(a.programId)}] mint ${a.mint.toBase58()} wallet balance ${formatTokenAmount(a.amount, a.decimals)}` +
        (a.delegate ? `, delegated ${formatTokenAmount(a.delegatedAmount, a.decimals)} to ${a.delegate.toBase58()}` : "") +
        (a.unsupportedReason ? ` — UNSUPPORTED: ${a.unsupportedReason}` : ""),
    );
  }
}

async function main() {
  await checkProgram();
  await checkMints();
  const wallet = process.argv[2];
  if (wallet) await checkWallet(wallet);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
