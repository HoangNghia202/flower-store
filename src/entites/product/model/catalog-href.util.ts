import {
    catalogParamsToSearchParams,
    type CatalogParams,
} from "./catalog-params.schema";

/**
 * Merge `patch` onto `current` and return a "/catalog" href.
 * Keys set to `undefined` in `patch` are removed. Empty result → "/catalog".
 */
export function buildCatalogHref(
    current: CatalogParams,
    patch: Partial<CatalogParams>,
): string {
    const merged: CatalogParams = { ...current, ...patch };
    for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) {
            delete (merged as Record<string, unknown>)[k];
        }
    }
    const qs = catalogParamsToSearchParams(merged).toString();
    return qs ? `/catalog?${qs}` : "/catalog";
}
