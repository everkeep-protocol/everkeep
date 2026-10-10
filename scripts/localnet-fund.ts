// Funds wallets on the local validator for browser testing: airdrops SOL and
// mints 1,000 test tokens (one SPL Token mint, one Token-2022 mint) to the owner.
//
// Usage: npm run fund:localnet -- <OWNER_ADDRESS> [BENEFICIARY_ADDRESS]

import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "http://127.0.0.1:8899";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(RPC_URL)) {
  throw new Error(`Refusing to fund wallets on non-local RPC ${RPC_URL}`);
}

const DECIMALS = 6;
const connection = new Connection(RPC_URL, "confirmed");

async function airdrop(to: PublicKey, sol: number) {
  const sig = await connection.requestAirdrop(to, sol * LAMPORTS_PER_SOL);
  const bh = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
  console.log(`airdropped ${sol} SOL to ${to.toBase58()}`);
}

async function main() {
  const [ownerArg, beneficiaryArg] = process.argv.slice(2);
  if (!ownerArg) {
    console.error("Usage: npm run fund:localnet -- <OWNER_ADDRESS> [BENEFICIARY_ADDRESS]");
    process.exit(1);
  }
  const owner = new PublicKey(ownerArg);
  const payer = Keypair.generate();

  await airdrop(payer.publicKey, 5);
  await airdrop(owner, 10);
  if (beneficiaryArg) await airdrop(new PublicKey(beneficiaryArg), 2);

  for (const [label, programId] of [
    ["SPL Token", TOKEN_PROGRAM_ID],
    ["Token-2022", TOKEN_2022_PROGRAM_ID],
  ] as const) {
    const mint = await createMint(connection, payer, payer.publicKey, null, DECIMALS, undefined, undefined, programId);
    const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, owner, false, "confirmed", undefined, programId);
    await mintTo(connection, payer, mint, ata.address, payer, BigInt(1_000 * 10 ** DECIMALS), [], undefined, programId);
    console.log(`minted 1,000 ${label} test tokens (mint ${mint.toBase58()}) to ${owner.toBase58()}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
