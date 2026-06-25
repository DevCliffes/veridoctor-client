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
    value: string,
    options: any = {
      expires: 7,
      sameSite: "lax",
      path: "/",
      domain: getRootDomain(),
    },
  ) {
    Cookies.set(key, value, options);
  },
  /**
   * Get a cookie value
   * @param key
   * @returns - Returns the value (parsed if it's JSON)
   */
  get(key: string) {
    const value = Cookies.get(key);
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
