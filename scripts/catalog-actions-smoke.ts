// Run with:  npx tsx --conditions=react-server scripts/catalog-actions-smoke.ts
// (the react-server export condition resolves `server-only` to its empty module)
import "dotenv/config";
import { getProducts } from "../src/entites/product/actions/get-products";
import { getCatalogFacets } from "../src/entites/product/actions/get-catalog-facets";
import { getProductBySlug } from "../src/entites/product/actions/get-product-by-slug";
import { prisma } from "../prisma/prisma-instance";

async function main() {
    const page1 = await getProducts({ sort: "newest" });
    console.log(
        "page1",
        page1.items.length,
        "nextCursor?",
        Boolean(page1.nextCursor),
        "total",
        page1.total,
    );
    if (page1.nextCursor) {
        const page2 = await getProducts({
            sort: "newest",
            cursor: page1.nextCursor,
        });
        const overlap = page1.items.some((a) =>
            page2.items.some((b) => b.id === a.id),
        );
        console.log("page2", page2.items.length, "overlap", overlap);
    }
    const filtered = await getProducts({
        sort: "price-asc",
        category: "birthday",
    });
    console.log(
        "birthday+priceasc",
        filtered.items.length,
        "total",
        filtered.total,
    );
    const facets = await getCatalogFacets();
    console.log(
        "facets",
        facets.categories.map((c) => c.slug).join(","),
        "|",
        facets.colors.join(","),
    );
    const detail = await getProductBySlug(page1.items[0].slug);
    console.log("detail", detail?.name, "stems", detail?.stems.length);
    console.log("missing", await getProductBySlug("does-not-exist"));
    await prisma.$disconnect();
}

main();
