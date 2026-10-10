import { PublicKey } from "@solana/web3.js";
import { EVERKEEP_IDL, EVERKEEP_PROGRAM_ID } from "./program";

function idlSeed(name: "VAULT_SEED" | "REGISTRY_SEED"): Uint8Array {
  const constant = EVERKEEP_IDL.constants.find((c) => c.name === name);
  if (!constant) throw new Error(`IDL is missing constant ${name}`);
  return Uint8Array.from(JSON.parse(constant.value) as number[]);
}

/** b"vault" */
export const VAULT_SEED = idlSeed("VAULT_SEED");
/** b"registry" */
export const REGISTRY_SEED = idlSeed("REGISTRY_SEED");

/** Matches Rust `u64::to_le_bytes()`. */
export function u64LeBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
}

/** seeds = [REGISTRY_SEED, owner] */
export function findRegistryPda(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [REGISTRY_SEED, owner.toBytes()],
    EVERKEEP_PROGRAM_ID,
  )[0];
}

/** seeds = [VAULT_SEED, owner, nonce.to_le_bytes()], nonce = registry.next_vault_nonce at init */
export function findVaultPda(owner: PublicKey, nonce: bigint): PublicKey {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, owner.toBytes(), u64LeBytes(nonce)],
    EVERKEEP_PROGRAM_ID,
  )[0];
}
