// Copies the Anchor IDL + TS types from the everkeep-contract project (WSL) into
// this frontend. The contract project is only read, never modified.
//
// Usage: npm run sync-idl
// Override the source with EVERKEEP_CONTRACT_DIR (any path Node can read, e.g.
// \\wsl.localhost\Ubuntu\home\mariab\projects\everkeep-contract).

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_CONTRACT_DIR =
  "\\\\wsl.localhost\\Ubuntu\\home\\mariab\\projects\\everkeep-contract";

const contractDir = process.env.EVERKEEP_CONTRACT_DIR ?? DEFAULT_CONTRACT_DIR;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destDir = join(root, "lib", "everkeep", "idl");

const files = [
  ["target/idl/everkeep_contract.json", "everkeep_contract.json"],
  ["target/types/everkeep_contract.ts", "everkeep_contract.ts"],
];

mkdirSync(destDir, { recursive: true });

for (const [src, dest] of files) {
  const from = join(contractDir, ...src.split("/"));
  if (!existsSync(from)) {
    console.error(`Missing ${from}. Run \`anchor build\` in the contract project first.`);
    process.exit(1);
  }
  copyFileSync(from, join(destDir, dest));
  console.log(`copied ${src}`);
}

const idl = JSON.parse(readFileSync(join(destDir, "everkeep_contract.json"), "utf8"));
console.log(`program id: ${idl.address}`);
