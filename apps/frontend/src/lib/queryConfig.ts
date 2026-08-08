/**
 * Shared TanStack Query tuning constants. Every hook under `hooks/api/` should
 * reference one of these tiers instead of a raw millisecond literal, so cache
 * lifetimes stay intentional and comparable across the app.
 */
export const STALE_TIME = {
  /** Data that changes second-to-second (sync/online status). */
  REALTIME: 5_000,
  /** Frequently-polled counters (e.g. unread notification badges). */
  FAST: 10_000,
  SHORT: 30_000,
  BRIEF: 2 * 60_000,
  STANDARD: 3 * 60_000,
  MEDIUM: 5 * 60_000,
  LONG: 8 * 60_000,
  EXTENDED: 10 * 60_000,
  VERY_LONG: 15 * 60_000,
} as const;

export const GC_TIME = {
  STANDARD: 15 * 60_000,
  EXTENDED: 30 * 60_000,
} as const;

export const DEFAULT_QUERY_RETRY = 1;
export const DEFAULT_MUTATION_RETRY = 1;
