"use client";

import { useEffect, useState } from "react";

export interface CountdownParts {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function parseCountdown(targetIso: string, nowMs: number): CountdownParts {
  const totalMs = new Date(targetIso).getTime() - nowMs;
  if (totalMs <= 0) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    };
  }
  const seconds = Math.floor((totalMs / 1000) % 60);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  return { totalMs, days, hours, minutes, seconds, expired: false };
}

export function useCountdown(targetIso: string): CountdownParts {
  const [parts, setParts] = useState(() =>
    parseCountdown(targetIso, Date.now()),
  );

  useEffect(() => {
    const tick = () => setParts(parseCountdown(targetIso, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return parts;
}

export function formatCountdown(parts: CountdownParts): string {
  if (parts.expired) return "Elapsed";
  if (parts.days > 0) {
    return `${parts.days}d ${parts.hours}h ${parts.minutes}m`;
  }
  return `${parts.hours}h ${parts.minutes}m ${parts.seconds}s`;
}
