/** UI-only base58-ish validation for Solana pubkeys (mock-friendly). */
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidSolanaAddress(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  return BASE58_REGEX.test(trimmed);
}

export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
