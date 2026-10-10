# EverKeep Frontend

Web3 dashboard for **EverKeep** — non-custodial digital asset inheritance on Solana.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn-style UI primitives, Lucide icons
- Phantom via `@solana/wallet-adapter-react`
- Anchor client (`@anchor-lang/core`) against the existing `everkeep-contract` program

## Contract integration

The Anchor program lives in a separate WSL project and is **not** part of this repo:

- Contract: `\\wsl.localhost\Ubuntu\home\mariab\projects\everkeep-contract` (`/home/mariab/projects/everkeep-contract`)
- Program ID: `3PGofgQL2x3YiWqSyEUkg6nGZR66bmH3vwCRQ6yu8Xr2` (read from the IDL `address`; not configurable)
- IDL copy: `lib/everkeep/idl/everkeep_contract.json` + `everkeep_contract.ts`

After rebuilding the contract (`anchor build` in WSL), refresh the copy:

```bash
npm run sync-idl   # override source with EVERKEEP_CONTRACT_DIR=<path>
```

Model: the owner never deposits. **Approve SPL Tokens** makes the vault PDA an SPL delegate (`ApproveChecked`, SPL Token and Token-2022). After the inactivity period, the beneficiary's **Claim** has the vault PDA `transfer_checked` each delegated allowance. **Cancel Vault** revokes those delegations and closes the vault. PDAs:

- registry: `["registry", owner]`
- vault: `["vault", owner, registry.next_vault_nonce (u64 LE)]`

The program has no update instruction, so **Edit / Update Plan** is disabled; cancel and create a new vault instead.

## Running against Devnet (default)

The app targets Devnet by default (`NEXT_PUBLIC_SOLANA_CLUSTER=devnet`, RPC `https://api.devnet.solana.com`). A banner appears if the RPC is not a Devnet node or the program is not deployed there.

1. **Check deployment and tokens** (read-only, sends nothing):

   ```bash
   npm run check:devnet -- [YOUR_WALLET_ADDRESS]
   ```

   Reports whether the program exists on Devnet (and whether its binary matches the local build), verifies the PYUSD and USDC Devnet mints, and lists the wallet's SOL, token balances and delegations.

2. **Deploy (manual, only when you decide to)** from WSL in the contract folder. This uses the existing program keypair, so the Program ID stays `3PGofg…8Xr2`:

   ```bash
   anchor deploy --provider.cluster devnet
   ```

   The binary is ~255 KB; expect ~1.8 SOL rent (plus a temporary buffer of similar size during upload) from `~/.config/solana/id.json`.

3. **Fund wallets with test assets**: SOL from [faucet.solana.com](https://faucet.solana.com), PYUSD (Token-2022, mint `CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM`) from [faucet.paxos.com](https://faucet.paxos.com), USDC (SPL Token, mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`) from [faucet.circle.com](https://faucet.circle.com). The beneficiary needs a little SOL for claim fees and token-account rent.

4. **Phantom**: Settings → Developer Settings → Testnet Mode → Solana Devnet. Phantom only signs; the app submits through its own RPC, but Phantom's preview simulates on Phantom's selected network.

5. `npm run dev` and open [http://localhost:3000](http://localhost:3000).

The public Devnet RPC is rate-limited (HTTP 429). For smoother testing set `NEXT_PUBLIC_SOLANA_RPC_URL` to a dedicated Devnet endpoint in `.env.local`.

### Token support

- SPL Token and Token-2022 accounts are both listed, showing wallet balance and current delegate/allowance separately. An SPL account has one delegate, so approving the vault replaces any other delegate.
- Known Devnet mints are labelled (PYUSD, USDC); other mints show their address.
- Unsupported accounts are shown but not selectable: frozen accounts, and Token-2022 mints with an active transfer hook or non-transferable extension (the program rejects these in `validate_mint_extensions`).

## Running against localnet

Set `NEXT_PUBLIC_SOLANA_CLUSTER=localnet` in `.env.local` (RPC defaults to `http://127.0.0.1:8899`).

1. **Start the validator in WSL** (loads the already-built `.so` at the IDL's Program ID; nothing is deployed to devnet/mainnet):

   ```powershell
   wsl --cd "C:\Users\LENOVO\OneDrive\Рабочий стол\Everkeep" -e bash scripts/localnet-validator.sh
   ```

   Leave it running. Windows reaches it at `http://127.0.0.1:8899`.

2. **Fund your Phantom addresses** (SOL + 1,000 SPL Token and 1,000 Token-2022 test tokens to the owner; optional SOL to the beneficiary):

   ```bash
   npm run fund:localnet -- <OWNER_PUBKEY> [BENEFICIARY_PUBKEY]
   ```

3. **Run the app**: `npm install` then `npm run dev`, and open [http://localhost:3000](http://localhost:3000).

4. **Phantom**: Settings → Developer Settings → enable Testnet Mode (select Localnet if offered). Phantom's balance display may not reflect localnet.

5. To test claims quickly, pick the **60 sec** inactivity preset, then open `/claim` with the beneficiary wallet.

Headless end-to-end check of all five instructions against the running validator:

```bash
npm run smoke:localnet
```

The validator is started with `--reset`, so restarting it wipes all vaults and balances (re-run step 2).

## Scripts

| Script | Purpose |
|--------|---------|
| `dev` / `build` / `start` | Next.js |
| `lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `sync-idl` | Copy IDL + types from the WSL contract |
| `fund:localnet` | Airdrop SOL and mint test tokens on localnet |
| `smoke:localnet` | End-to-end instruction test on localnet |
| `check:devnet` | Read-only Devnet deployment, mint and wallet check |

## Routes

- `/` — Landing
- `/dashboard` — Owner vault: create, approve tokens, check in, cancel
- `/claim` — Beneficiary claim portal (`?vault=<vault PDA or owner address>`)
