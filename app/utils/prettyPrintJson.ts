/**
 * Pretty-print JSON with consistent formatting
 * @param obj - Object to stringify
 * @returns Pretty-printed JSON string
 */
export const prettyPrintJson = (obj: unknown): string => {
  return JSON.stringify(obj, null, 2);
};