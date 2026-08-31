import assert from "node:assert/strict";
import {
    parseCatalogParams,
    buildCatalogHref,
    catalogParamsKey,
    hasActiveFilters,
    mapProductCard,
    mapProductDetail,
    PLACEHOLDER_IMAGE,
    toPrismaWhere,
    toPrismaOrderBy,
    encodeCursor,
    decodeCursor,
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
// blank numeric params are treated as absent (not coerced to 0)
assert.equal(
    parseCatalogParams({ minPrice: "", maxPrice: "" }).minPrice,
    undefined,
);
assert.deepEqual(parseCatalogParams({ minPrice: "", maxPrice: "" }), {
    sort: "newest",
});

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

// --- mapProductCard / mapProductDetail ---
{
    const vm = mapProductCard({
        id: "p1", name: "Rose Garden", slug: "rose-garden", price: 320000,
        images: [], stock: 0, isFeatured: true, category: { name: "Birthday", slug: "birthday" },
    });
    assert.equal(vm.image, PLACEHOLDER_IMAGE);
    assert.equal(vm.hasImage, false);
    assert.equal(vm.inStock, false);
    assert.equal(vm.categoryName, "Birthday");
}
{
    const vm = mapProductCard({
        id: "p2", name: "Tulip Mix", slug: "tulip-mix", price: 280000,
        images: ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
        stock: 5, isFeatured: false, category: { name: "Wedding", slug: "wedding" },
    });
    assert.equal(vm.image, "https://cdn.example/a.jpg");
    assert.equal(vm.hasImage, true);
    assert.equal(vm.inStock, true);
}
{
    const vm = mapProductDetail({
        id: "p3", name: "Lily", slug: "lily", description: "Elegant white lilies.",
        price: 400000, images: [], stock: 3, isFeatured: false,
        category: { name: "Sympathy", slug: "sympathy" },
        stems: [{ quantity: 5, stem: { name: "White Lily", color: "white" } }],
    });
    assert.equal(vm.categorySlug, "sympathy");
    assert.deepEqual(vm.stems, [{ name: "White Lily", color: "white", quantity: 5 }]);
}

// --- toPrismaWhere ---
assert.deepEqual(toPrismaWhere({ sort: "newest" }), {});
assert.deepEqual(toPrismaWhere({ sort: "newest", category: "birthday" }), {
    category: { slug: "birthday" },
});
assert.deepEqual(toPrismaWhere({ sort: "newest", color: "Red" }), {
    stems: {
        some: { stem: { color: { equals: "Red", mode: "insensitive" } } },
    },
});
assert.deepEqual(toPrismaWhere({ sort: "newest", q: "rose" }), {
    name: { contains: "rose", mode: "insensitive" },
});
assert.deepEqual(
    toPrismaWhere({ sort: "newest", minPrice: 100000, maxPrice: 500000 }),
    { price: { gte: 100000, lte: 500000 } },
);
// swapped bounds get normalised
assert.deepEqual(
    toPrismaWhere({ sort: "newest", minPrice: 500000, maxPrice: 100000 }),
    { price: { gte: 100000, lte: 500000 } },
);
assert.deepEqual(toPrismaWhere({ sort: "newest", minPrice: 100000 }), {
    price: { gte: 100000 },
});
assert.deepEqual(toPrismaWhere({ sort: "newest", maxPrice: 500000 }), {
    price: { lte: 500000 },
});

// --- toPrismaOrderBy ---
assert.deepEqual(toPrismaOrderBy({ sort: "newest" }), [
    { createdAt: "desc" },
    { id: "desc" },
]);
assert.deepEqual(toPrismaOrderBy({ sort: "price-asc" }), [
    { price: "asc" },
    { id: "asc" },
]);
assert.deepEqual(toPrismaOrderBy({ sort: "price-desc" }), [
    { price: "desc" },
    { id: "desc" },
]);
assert.deepEqual(toPrismaOrderBy({ sort: "featured" }), [
    { isFeatured: "desc" },
    { id: "desc" },
]);

// --- encodeCursor / decodeCursor round-trip ---
{
    const cur = encodeCursor("clh9x2k7p0000abcd1234wxyz");
    assert.equal(typeof cur, "string");
    assert.ok(!/[+/=]/.test(cur)); // base64url, no padding
    assert.equal(decodeCursor(cur), "clh9x2k7p0000abcd1234wxyz");
}
// malformed cursors decode to null
assert.equal(decodeCursor("not valid !!"), null);
assert.equal(decodeCursor("@@@"), null);
assert.equal(decodeCursor(""), null);

console.log("catalog-selfcheck: OK");
