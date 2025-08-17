/**
 * Map Utilities
 * 
 * Utilities for comparing Maps to prevent unnecessary re-allocations
 * in Zustand stores that could trigger infinite render loops.
 */

/**
 * Performs a shallow comparison of two Maps to determine if they are equal.
 * Compares keys and values using strict equality (===).
 * 
 * @param a First Map to compare
 * @param b Second Map to compare
 * @returns true if Maps have same keys and values, false otherwise
 */
export function areMapsEqual<K, V>(a: Map<K, V>, b: Map<K, V>): boolean {
  // Quick size check
  if (a.size !== b.size) {
    return false;
  }
  
  // Compare each key-value pair
  for (const [key, value] of a) {
    if (!b.has(key) || b.get(key) !== value) {
      return false;
    }
  }
  
  return true;
}

/**
 * Creates a new Map only if the contents would be different from the existing Map.
 * This prevents unnecessary re-allocations that trigger React re-renders.
 * 
 * @param existingMap Current Map
 * @param newEntries New entries to set in the Map
 * @returns existingMap if contents are the same, otherwise a new Map
 */
export function updateMapIfChanged<K, V>(
  existingMap: Map<K, V>, 
  newEntries: [K, V][]
): Map<K, V> {
  const prospectiveMap = new Map(newEntries);
  
  if (areMapsEqual(existingMap, prospectiveMap)) {
    return existingMap; // No change, return existing reference
  }
  
  return prospectiveMap; // Contents changed, return new Map
}

/**
 * Safely updates a Map by only creating a new instance if the operation
 * would actually change the Map's contents.
 * 
 * @param existingMap Current Map
 * @param key Key to set
 * @param value Value to set
 * @returns existingMap if no change needed, otherwise new Map with update
 */
export function setMapEntry<K, V>(
  existingMap: Map<K, V>,
  key: K,
  value: V
): Map<K, V> {
  const currentValue = existingMap.get(key);
  
  // If key exists and value is the same, no change needed
  if (existingMap.has(key) && currentValue === value) {
    return existingMap;
  }
  
  // Create new Map with the update
  const newMap = new Map(existingMap);
  newMap.set(key, value);
  return newMap;
}

/**
 * Safely deletes from a Map by only creating a new instance if the key exists.
 * 
 * @param existingMap Current Map
 * @param key Key to delete
 * @returns existingMap if key doesn't exist, otherwise new Map without the key
 */
export function deleteMapEntry<K, V>(
  existingMap: Map<K, V>,
  key: K
): Map<K, V> {
  // If key doesn't exist, no change needed
  if (!existingMap.has(key)) {
    return existingMap;
  }
  
  // Create new Map without the key
  const newMap = new Map(existingMap);
  newMap.delete(key);
  return newMap;
}