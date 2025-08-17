/**
 * Hook to detect if user has data saver enabled
 * @returns boolean - true if data saver is enabled
 */
export const useDataSaver = () =>
  (navigator as any).connection?.saveData === true;