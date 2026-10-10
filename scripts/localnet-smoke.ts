// End-to-end check of the frontend's chain layer (lib/everkeep) against a local
// validator started with scripts/localnet-validator.sh. Keypairs stand in for
// Phantom; every instruction is built by the same helpers the UI uses.
//
// Usage: npm run smoke:localnet

import assert from "node:assert/strict";
import { AnchorProvider, Wallet } from "@anchor-lang/core";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SYSVAR_CLOCK_PUBKEY,
  type Transaction,
} from "@solana/web3.js";
import { describeTxError } from "@/lib/everkeep/errors";
import {
  approveVaultIx,
  cancelVaultIx,
  checkInIx,
  chunkIntoTransactions,
  claimDelegatedTokensIxs,
  initializeVaultIx,
} from "@/lib/everkeep/instructions";
import { findRegistryPda, findVaultPda } from "@/lib/everkeep/pda";
import { EVERKEEP_PROGRAM_ID, getEverkeepProgram, type EverkeepProgram } from "@/lib/everkeep/program";
import { sendTransactions } from "@/lib/everkeep/send";
import { fetchOwnerTokenAccounts } from "@/lib/everkeep/tokens";
import {
  deriveVaultViewModel,
  fetchActiveVaultAddress,
  fetchNextVaultAddress,
  fetchVaultSnapshot,
  resolveVaultSnapshot,
} from "@/lib/everkeep/vault";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "http://127.0.0.1:8899";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(RPC_URL)) {
  throw new Error(`Refusing to run against non-local RPC ${RPC_URL}`);
}

const PERIOD_SECONDS = 6;
const DECIMALS = 6;
const connection = new Connection(RPC_URL, "confirmed");

const programFor = (signer: Keypair): EverkeepProgram =>
  getEverkeepProgram(new AnchorProvider(connection, new Wallet(signer), { commitment: "confirmed" }));

/** Same sender the app uses (one signing pass, minContextSlot, blockhash-expiry confirmation). */
async function send(program: EverkeepProgram, txs: Transaction[]) {
  const provider = program.provider as AnchorProvider;
  return sendTransactions(connection, provider.wallet as Wallet, txs);
}

async function airdrop(kp: Keypair, sol: number) {
  const sig = await connection.requestAirdrop(kp.publicKey, sol * LAMPORTS_PER_SOL);
  const bh = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
}

async function chainTime(): Promise<number> {
  const info = await connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY, "confirmed");
  return Number(info!.data.readBigInt64LE(32));
}

function step(name: string) {
  console.log(`\n▶ ${name}`);
}

async function main() {
  const programInfo = await connection.getAccountInfo(EVERKEEP_PROGRAM_ID);
  assert.ok(programInfo?.executable, `program ${EVERKEEP_PROGRAM_ID.toBase58()} not loaded on ${RPC_URL}`);
  console.log(`program ${EVERKEEP_PROGRAM_ID.toBase58()} is executable on ${RPC_URL}`);

  const owner = Keypair.generate();
  const beneficiary = Keypair.generate();
  await Promise.all([airdrop(owner, 5), airdrop(beneficiary, 2)]);

  step("mint SPL Token + Token-2022 balances to the owner");
  const mints = [];
  for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
    const mint = await createMint(connection, owner, owner.publicKey, null, DECIMALS, undefined, undefined, programId);
    const ata = await getOrCreateAssociatedTokenAccount(connection, owner, mint, owner.publicKey, false, "confirmed", undefined, programId);
    await mintTo(connection, owner, mint, ata.address, owner, BigInt(1_000 * 10 ** DECIMALS), [], undefined, programId);
    mints.push({ mint, programId });
  }
  const ownerProgram = programFor(owner);
  const beneficiaryProgram = programFor(beneficiary);

  step("initialize_vault + approve_checked (one transaction)");
  const next = await fetchNextVaultAddress(ownerProgram, owner.publicKey);
  assert.equal(next.registryExists, false);
  assert.ok(next.registry.equals(findRegistryPda(owner.publicKey)));
  assert.ok(next.vault.equals(findVaultPda(owner.publicKey, BigInt(0))), "first vault uses nonce 0");
  const tokens = await fetchOwnerTokenAccounts(connection, owner.publicKey);
  assert.equal(tokens.length, 2);
  const allowance = BigInt(400 * 10 ** DECIMALS);
  const init = await initializeVaultIx(ownerProgram, {
    owner: owner.publicKey,
    registry: next.registry,
    vault: next.vault,
    beneficiary: beneficiary.publicKey,
    inactivityPeriodSeconds: PERIOD_SECONDS,
  });
  const createTxs = chunkIntoTransactions(
    [init],
    tokens.map((t) => [approveVaultIx(t, next.vault, owner.publicKey, allowance)]),
  );
  assert.equal(createTxs.length, 1);
  console.log("  sig", (await send(ownerProgram, createTxs))[0]);

  const active = await fetchActiveVaultAddress(ownerProgram, owner.publicKey);
  assert.ok(active?.equals(next.vault), "registry.active_vault points at the new vault");
  const snapshot = await fetchVaultSnapshot(ownerProgram, next.vault);
  assert.ok(snapshot);
  assert.equal(snapshot.delegatedAccounts.length, 2);
  assert.ok(snapshot.vault.beneficiary.equals(beneficiary.publicKey));
  const vm = deriveVaultViewModel(snapshot, Date.now());
  assert.notEqual(vm.conditionStatus, "claimable");
  console.log("  vault", vm.vaultPda, "nonce", vm.nonce, "status", vm.conditionStatus);

  step("beneficiary lookup by owner address resolves through the registry");
  const resolved = await resolveVaultSnapshot(beneficiaryProgram, owner.publicKey);
  assert.ok(resolved?.vault.address.equals(next.vault));

  step("early claim is rejected by the program");
  const earlyIxs = await claimDelegatedTokensIxs(beneficiaryProgram, beneficiary.publicKey, next.vault, snapshot.delegatedAccounts[0], allowance);
  try {
    await send(beneficiaryProgram, chunkIntoTransactions([], [earlyIxs]));
    assert.fail("early claim should fail");
  } catch (err) {
    const msg = describeTxError(err);
    console.log("  rejected:", msg);
    assert.match(msg, /inactivity period has not elapsed/i);
  }

  step("check_in updates last_check_in");
  const before = snapshot.vault.lastCheckIn;
  await new Promise((r) => setTimeout(r, 1500));
  await send(ownerProgram, chunkIntoTransactions([await checkInIx(ownerProgram, owner.publicKey, next.vault)], []));
  const afterCheckIn = await fetchVaultSnapshot(ownerProgram, next.vault);
  assert.ok(afterCheckIn && afterCheckIn.vault.lastCheckIn >= before);
  console.log("  last_check_in", before, "->", afterCheckIn!.vault.lastCheckIn);

  step(`wait ${PERIOD_SECONDS}s of chain time, then claim_delegated_tokens for both mints`);
  const unlocksAt = afterCheckIn!.vault.lastCheckIn + PERIOD_SECONDS;
  while ((await chainTime()) < unlocksAt) await new Promise((r) => setTimeout(r, 500));
  const claimable = await fetchVaultSnapshot(beneficiaryProgram, next.vault);
  assert.equal(deriveVaultViewModel(claimable!, (await chainTime()) * 1000).conditionStatus, "claimable");
  const groups = await Promise.all(
    claimable!.delegatedAccounts.map((a) =>
      claimDelegatedTokensIxs(beneficiaryProgram, beneficiary.publicKey, next.vault, a, a.delegatedAmount),
    ),
  );
  console.log("  sig", (await send(beneficiaryProgram, chunkIntoTransactions([], groups)))[0]);
  for (const { mint, programId } of mints) {
    const ata = getAssociatedTokenAddressSync(mint, beneficiary.publicKey, false, programId);
    const acct = await getAccount(connection, ata, "confirmed", programId);
    assert.equal(acct.amount, allowance, `beneficiary received allowance for ${mint.toBase58()}`);
  }
  console.log("  beneficiary received 400 of each mint");

  step("cancel_vault closes the vault (no delegations left after full claim)");
  const drained = await fetchVaultSnapshot(ownerProgram, next.vault);
  await send(ownerProgram, chunkIntoTransactions([await cancelVaultIx(ownerProgram, owner.publicKey, next.vault, drained!.delegatedAccounts)], []));
  assert.equal(await fetchActiveVaultAddress(ownerProgram, owner.publicKey), null);
  assert.equal(await fetchVaultSnapshot(ownerProgram, next.vault), null);

  step("second vault uses nonce 1; cancel_vault revokes live delegations");
  const second = await fetchNextVaultAddress(ownerProgram, owner.publicKey);
  assert.ok(second.vault.equals(findVaultPda(owner.publicKey, BigInt(1))));
  assert.ok(!second.vault.equals(next.vault), "vault PDAs are never reused");
  const tokens2 = await fetchOwnerTokenAccounts(connection, owner.publicKey);
  const init2 = await initializeVaultIx(ownerProgram, {
    owner: owner.publicKey,
    registry: second.registry,
    vault: second.vault,
    beneficiary: beneficiary.publicKey,
    inactivityPeriodSeconds: 30 * 86_400,
  });
  await send(ownerProgram, chunkIntoTransactions([init2], tokens2.map((t) => [approveVaultIx(t, second.vault, owner.publicKey, BigInt(1))])));
  const live = await fetchVaultSnapshot(ownerProgram, second.vault);
  assert.equal(live!.delegatedAccounts.length, 2);
  await send(ownerProgram, chunkIntoTransactions([await cancelVaultIx(ownerProgram, owner.publicKey, second.vault, live!.delegatedAccounts)], []));
  const revoked = await fetchOwnerTokenAccounts(connection, owner.publicKey);
  assert.ok(revoked.every((t) => t.delegate === null), "all delegations revoked");
  assert.equal(await fetchActiveVaultAddress(ownerProgram, owner.publicKey), null);

  console.log("\n✔ localnet smoke test passed");
}

main().catch((err) => {
  console.error("\n✖ smoke test failed:", describeTxError(err));
  console.error(err);
  process.exit(1);
});
