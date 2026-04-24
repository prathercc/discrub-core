/**
 *
 * @param seconds Number of seconds to wait for
 * @param callback Optional function to be used after the specified seconds have passed
 */
export const wait = async (seconds: number, callback = () => {}) => {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  return callback();
};

/**
 * Map utility helpers for immutable map updates
 */
export const MapUtils = {
  /**
   * Set a single key-value pair in a map
   * @param map The original map
   * @param key The key to set
   * @param value The value to set
   * @returns A new map with the key-value pair set
   */
  set: <T>(map: Record<string, T>, key: string, value: T): Record<string, T> => ({
    ...map,
    [key]: value,
  }),

  /**
   * Update a single value in a map using an updater function
   * @param map The original map
   * @param key The key to update
   * @param updater Function that takes the current value and returns the new value
   * @returns A new map with the updated value
   */
  update: <T>(
    map: Record<string, T>,
    key: string,
    updater: (current: T | undefined) => T,
  ): Record<string, T> => ({
    ...map,
    [key]: updater(map[key]),
  }),

  /**
   * Set a value in a nested map (two levels deep)
   * @param map The original nested map
   * @param key1 The first level key
   * @param key2 The second level key
   * @param value The value to set
   * @returns A new nested map with the value set
   */
  setNested: <T>(
    map: Record<string, Record<string, T>>,
    key1: string,
    key2: string,
    value: T,
  ): Record<string, Record<string, T>> => ({
    ...map,
    [key1]: { ...(map[key1] || {}), [key2]: value },
  }),

  /**
   * Update a value in a nested map (two levels deep) using an updater function
   * @param map The original nested map
   * @param key1 The first level key
   * @param key2 The second level key
   * @param updater Function that takes the current value and returns the new value
   * @returns A new nested map with the updated value
   */
  updateNested: <T>(
    map: Record<string, Record<string, T>>,
    key1: string,
    key2: string,
    updater: (current: T | undefined) => T,
  ): Record<string, Record<string, T>> => ({
    ...map,
    [key1]: {
      ...(map[key1] || {}),
      [key2]: updater(map[key1]?.[key2]),
    },
  }),

  /**
   * Remove a key from a map
   * @param map The original map
   * @param key The key to remove
   * @returns A new map without the specified key
   */
  remove: <T>(map: Record<string, T>, key: string): Record<string, T> => {
    const { [key]: _, ...rest } = map;
    return rest;
  },

  /**
   * Remove a nested key from a map (two levels deep)
   * @param map The original nested map
   * @param key1 The first level key
   * @param key2 The second level key to remove
   * @returns A new nested map without the specified nested key
   */
  removeNested: <T>(
    map: Record<string, Record<string, T>>,
    key1: string,
    key2: string,
  ): Record<string, Record<string, T>> => {
    if (!map[key1]) return map;
    const { [key2]: _, ...rest } = map[key1];
    return {
      ...map,
      [key1]: rest,
    };
  },

  /**
   * Merge multiple maps together (shallow merge)
   * @param maps The maps to merge
   * @returns A new map with all key-value pairs from all input maps
   */
  merge: <T>(...maps: Record<string, T>[]): Record<string, T> => {
    return Object.assign({}, ...maps);
  },
};
