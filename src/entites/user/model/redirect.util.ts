/**
 * Constrain a user-supplied post-auth redirect target to a safe in-app path.
 *
 * Query params like `?redirectUrl=` are attacker-controllable, so anything that
 * is not a plain absolute path (`/...`, but not protocol-relative `//host`) is
 * rejected in favour of the fallback.
 */
export function safeRedirectPath(
    raw: string | string[] | undefined,
    fallback = "/catalog",
): string {
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value && value.startsWith("/") && !value.startsWith("//")
        ? value
        : fallback;
}
