const LAMPORTS_PER_SOL = 1_000_000_000;

export function lamportsToSol(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  return sol % 1 === 0 ? `${sol} SOL` : `${sol.toFixed(4)} SOL`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
