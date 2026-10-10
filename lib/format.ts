const LAMPORTS_PER_SOL = 1_000_000_000;

export function lamportsToSol(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  return sol % 1 === 0 ? `${sol} SOL` : `${sol.toFixed(4)} SOL`;
}

const DURATION_UNITS: [number, string][] = [
  [86_400, "day"],
  [3_600, "hour"],
  [60, "minute"],
  [1, "second"],
];

/** Largest whole unit, e.g. 2592000 -> "30 days", 60 -> "1 minute". */
export function formatDuration(seconds: number): string {
  for (const [size, unit] of DURATION_UNITS) {
    if (seconds >= size && seconds % size === 0) {
      const n = seconds / size;
      return `${n.toLocaleString("en-US")} ${unit}${n === 1 ? "" : "s"}`;
    }
  }
  return `${seconds} seconds`;
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
