import assert from "node:assert/strict";
import {
    parseCatalogParams,
    buildCatalogHref,
    catalogParamsKey,
    hasActiveFilters,
} from "../src/entites/product/model";

// --- parseCatalogParams ---
assert.deepEqual(parseCatalogParams({}), { sort: "newest" });
assert.deepEqual(
    parseCatalogParams({
        category: "birthday",
        color: "Red",
        minPrice: "100000",
        sort: "price-asc",
    }),
    { category: "birthday", color: "Red", minPrice: 100000, sort: "price-asc" },
);
// junk never throws
assert.deepEqual(
    parseCatalogParams({ sort: "nonsense", minPrice: "abc", page: "x" }),
    { sort: "newest" },
);
// array values take the first
assert.equal(parseCatalogParams({ q: ["rose", "tulip"] }).q, "rose");
// blank strings are dropped
assert.equal(parseCatalogParams({ category: "" }).category, undefined);

// --- buildCatalogHref ---
assert.equal(
    buildCatalogHref({ sort: "newest" }, { category: "birthday" }),
    "/catalog?category=birthday",
);
assert.equal(buildCatalogHref({ sort: "newest" }, {}), "/catalog");
assert.equal(
    buildCatalogHref(
        { sort: "newest", category: "birthday" },
        { category: undefined },
    ),
    "/catalog",
);
assert.equal(
    buildCatalogHref(
        { sort: "price-asc", category: "birthday" },
        { sort: "newest" },
    ),
    "/catalog?category=birthday",
); // default sort omitted
{
    const href = buildCatalogHref(
        { sort: "newest" },
        { minPrice: 100000, maxPrice: 500000 },
    );
    assert.ok(
        href.includes("minPrice=100000") && href.includes("maxPrice=500000"),
    );
}

// --- catalogParamsKey / hasActiveFilters ---
assert.equal(
    catalogParamsKey({ sort: "newest" }),
    catalogParamsKey({ sort: "newest" }),
);
assert.notEqual(
    catalogParamsKey({ sort: "newest" }),
    catalogParamsKey({ sort: "newest", q: "x" }),
);
assert.equal(hasActiveFilters({ sort: "newest" }), false);
assert.equal(hasActiveFilters({ sort: "price-asc" }), false); // sort is not a "filter"
assert.equal(hasActiveFilters({ sort: "newest", color: "Red" }), true);

console.log("catalog-selfcheck: OK");
