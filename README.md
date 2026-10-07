# EverKeep Frontend MVP

Premium Web3 dashboard for **EverKeep** — decentralized digital asset inheritance on Solana.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn-style UI primitives
- Lucide icons
- Mock wallet state (ready to swap for `@solana/wallet-adapter-react`)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo scenarios

Use the **Demo scenario** selector in the header (large screens):

| Scenario | Behavior |
|----------|----------|
| Landing (disconnected) | Marketing home |
| Owner — active vault | Connected owner + active vault |
| Owner — deadline warning | Countdown in warning state |
| Beneficiary — claimable | Claim portal pre-loaded via scenario |

Demo dates are re-anchored to the current time, so the active vault always has ~15 days left, the warning vault ~3 days, and the claimable vault is always past its threshold.

## Routes

- `/` — Landing: hero, metric cards, five-step "How it works"
- `/dashboard` — Owner vault overview & actions (check-in, update, deposit, cancel)
- `/claim` — Beneficiary claim portal (`?vault=<pda>` deep link supported)

### Claim portal demo

1. Open `/claim` and click one of the **Demo vaults** chips (`9Qva...C7m` is past its threshold; `8Fva...K29` is still active).
2. Click **Connect as beneficiary** (the header button connects the owner wallet).
3. Run **Execute claim()** once the condition is met.

## Wallet integration (next step)

Replace mock handlers in `components/wallet/connect-wallet-button.tsx` and `providers/everkeep-app-provider.tsx` with Solana Wallet Adapter and Anchor client calls (`initialize`, `deposit`, `check_in`, `update_plan`, `cancel`, `claim`).
