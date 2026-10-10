import { Program, type Provider } from "@anchor-lang/core";
import { PublicKey, type Connection } from "@solana/web3.js";
import idl from "./idl/everkeep_contract.json";
import type { EverkeepContract } from "./idl/everkeep_contract";

/** Program ID comes from the contract's generated IDL (`npm run sync-idl`). */
export const EVERKEEP_PROGRAM_ID = new PublicKey(idl.address);

export const EVERKEEP_IDL = idl;

export type EverkeepProgram = Program<EverkeepContract>;

export function getEverkeepProgram(provider: Provider): EverkeepProgram {
  return new Program<EverkeepContract>(idl, provider);
}

/** For account reads that need no signer (e.g. the beneficiary portal before connecting). */
export function getReadonlyEverkeepProgram(connection: Connection): EverkeepProgram {
  return getEverkeepProgram({ connection });
}
