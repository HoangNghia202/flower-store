import Link from "next/link";
import type { CatalogParams } from "@/src/entites/product/model";
import { catalogParamsKey } from "@/src/entites/product/model";
import type { ProductPage } from "@/src/entites/product/actions";
import { ProductFeed } from "@/src/features/product-feed";

export function CatalogProductsWidget({
    params,
    page,
}: {
    params: CatalogParams;
    page: ProductPage;
}) {
    return (
        <section className="py-6">
            <header className="mb-4 flex items-baseline justify-between">
                <h1 className="font-playfair text-2xl font-bold text-gray-900">
                    Catalog
                </h1>
                <span className="text-sm text-gray-500">
                    {page.total} results
                </span>
            </header>

            {page.total === 0 ? (
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                    <p className="text-gray-500">
                        No arrangements match these filters.
                    </p>
                    <Link
                        href="/catalog"
                        className="text-sm text-pink-600 underline"
                    >
                        Clear all filters
                    </Link>
                </div>
            ) : (
                <ProductFeed
                    key={catalogParamsKey(params)}
                    initialItems={page.items}
                    initialCursor={page.nextCursor}
                    total={page.total}
                    params={params}
                />
            )}
        </section>
    );
}
