import { z } from "zod";

export const CATALOG_SORTS = [
    { value: "newest", label: "Newest" },
    { value: "price-asc", label: "Price: low to high" },
    { value: "price-desc", label: "Price: high to low" },
    { value: "featured", label: "Featured" },
] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number]["value"];

const optionalString = z.string().trim().min(1).optional().catch(undefined);

const optionalMoney = z
    .preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
        z.coerce.number().int().min(0),
    )
    .optional()
    .catch(undefined);

export const catalogParamsSchema = z.object({
    category: optionalString,
    color: optionalString,
    minPrice: optionalMoney,
    maxPrice: optionalMoney,
    sort: z
        .enum(["newest", "price-asc", "price-desc", "featured"])
        .catch("newest"),
    q: z.string().trim().min(1).max(100).optional().catch(undefined),
});

export type CatalogParams = z.infer<typeof catalogParamsSchema>;

export function parseCatalogParams(
    sp: Record<string, string | string[] | undefined>,
): CatalogParams {
    const flat: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(sp)) {
        flat[k] = Array.isArray(v) ? v[0] : v;
    }
    const parsed = catalogParamsSchema.parse(flat);
    return Object.fromEntries(
        Object.entries(parsed).filter(([, v]) => v !== undefined),
    ) as CatalogParams;
}

const DEFAULTS: CatalogParams = { sort: "newest" };

const ORDERED_KEYS: (keyof CatalogParams)[] = [
    "q",
    "category",
    "color",
    "minPrice",
    "maxPrice",
    "sort",
];

export function catalogParamsToSearchParams(p: CatalogParams): URLSearchParams {
    const usp = new URLSearchParams();
    for (const key of ORDERED_KEYS) {
        const value = p[key];
        if (value === undefined || value === "") continue;
        if (key === "sort" && value === DEFAULTS.sort) continue;
        usp.set(key, String(value));
    }
    return usp;
}

export function catalogParamsKey(p: CatalogParams): string {
    return "catalog:" + catalogParamsToSearchParams(p).toString();
}

export function hasActiveFilters(p: CatalogParams): boolean {
    return (
        p.category !== undefined ||
        p.color !== undefined ||
        p.minPrice !== undefined ||
        p.maxPrice !== undefined ||
        p.q !== undefined
    );
}
