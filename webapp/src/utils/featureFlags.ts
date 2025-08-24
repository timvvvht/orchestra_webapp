/**
 * Centralized feature flags for the webapp
 *
 * IMPORTANT: Flags are evaluated at module load and should be simple/pure.
 *
 * Safety: For production builds, some flags are hard-forced to safe defaults.
 */

type FeatureFlags = {
  /**
   * Hides tool result payloads in the chat UI when enabled in development.
   * Forced off in production regardless of environment configuration.
   */
  readonly hideToolResults: boolean;
};

function parseBooleanEnv(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

const isProd = import.meta.env.PROD;

const hideToolResultsDevOnly = (() => {
  // Allow either "1" or "true" in development
  const raw = import.meta.env.VITE_HIDE_TOOL_RESULTS as unknown;
  const parsed = parseBooleanEnv(raw);
  // Safety: never hide tool results in production builds
  if (isProd) return false;
  return parsed;
})();

export const featureFlags: FeatureFlags = Object.freeze({
  hideToolResults: hideToolResultsDevOnly,
});

export default featureFlags;
