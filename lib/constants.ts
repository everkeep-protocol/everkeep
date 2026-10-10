const DAY = 86_400;

export const INACTIVITY_PRESETS: { label: string; seconds: number }[] = [
  { label: "30 days", seconds: 30 * DAY },
  { label: "90 days", seconds: 90 * DAY },
  { label: "180 days", seconds: 180 * DAY },
];

/** Short period so claim can be exercised end-to-end on a local validator. */
export const LOCALNET_TEST_PRESET = { label: "60 sec", seconds: 60 };

export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  claim: "/claim",
} as const;
