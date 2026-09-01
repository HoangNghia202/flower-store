import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` during SSR and the first client render, `true` after hydration.
 *
 * Use this to gate client-only reads (e.g. a `persist`ed store) so the
 * server-rendered markup and the hydrated markup agree.
 */
export function useHydrated(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );
}
