import Cookies from "js-cookie";

function getRootDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.hostname.includes("veridoctor.com")
    ? ".veridoctor.com"
    : undefined;
}

const CookieService = {
  /**
   * Set a cookie value
   * @param key
   * @param value - Objects/Arrays will be stringified by js-cookie
   * @param options - e.g., { expires: 7, path: '/' }
   */
  set(
    key: string,
    value: string | null | undefined,
    options: any = {
      expires: 7,
      sameSite: "lax",
      path: "/",
      domain: getRootDomain(),
    },
  ) {
    // FIX: js-cookie coerces null/undefined into the literal strings
    // "null"/"undefined" when writing document.cookie. Once written,
    // every future read returns that bad string forever (it's truthy,
    // so "|| null" checks elsewhere don't catch it) — this was the
    // root cause of identity_id=null being sent to the notifications
    // endpoint on every poll, crashing it with a 500. Treat a
    // null/undefined/empty value as "remove this cookie" instead of
    // writing a bad literal.
    if (value === null || value === undefined || value === "") {
      Cookies.remove(key, { path: "/", domain: getRootDomain() });
      return;
    }
    Cookies.set(key, value, options);
  },

  /**
   * Get a cookie value
   * @param key
   * @returns - Returns the value (parsed if it's JSON)
   */
  get(key: string) {
    const value = Cookies.get(key);
    // FIX: guard against any bad "null"/"undefined" strings already
    // sitting in a user's browser from before this fix shipped.
    if (value === "null" || value === "undefined") return undefined;
    return value;
  },

  /**
   * Remove a cookie
   * @param key
   */
  remove(key: string) {
    Cookies.remove(key, { path: "/", domain: getRootDomain() });
  },
};

export default CookieService;
