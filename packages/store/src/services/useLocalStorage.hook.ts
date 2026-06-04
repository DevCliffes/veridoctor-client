/***
 * local storage accessor for client and server components,
 * precents undefined errors while accessing localstorage on server components
 */
export const safeStorage = {
  /**
   * gets local storage variable or returns the fallback value if not found
   * @param key local storage ket
   * @param fallback a fallback value to return if localstorage returns null
   */
  get: (key: string, fallback = null) => {
    if (typeof window === "undefined") return fallback;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (error) {
      console.error("Storage read error:", error);
      return fallback;
    }
  },

  /**
   * eets local storage variable or returns the fallback value if not found
   * @param key local storage ket
   * @param value value to be set in the localstorage variable
   */
  set: (key: string, value: any) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Storage write error:", error);
    }
  },

  /**
   * removes the stored item from localstorage
   * @param key local storage ket
   */
  remove: (key: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },

  /**
   * clears all localstorage items
   */
  clear: () => {
    if (typeof window === "undefined") return;
    window.localStorage.clear();
  },
};
