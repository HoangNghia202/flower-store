import type { CatalogParams, CatalogFacets } from "@/src/entites/product/model";
import {
    CatalogSearchInput,
    CatalogSortSelect,
    CatalogCategorySelect,
    CatalogColorSwatches,
    CatalogPriceFilter,
    CatalogActivePills,
    CatalogFilterSheet,
} from "@/src/features/catalog-filter";

export function CatalogFilterWidget({
    params,
    facets,
}: {
    params: CatalogParams;
    facets: CatalogFacets;
}) {
    return (
        <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
                <CatalogSearchInput params={params} />
                <div className="hidden items-center gap-3 md:flex">
                    <CatalogCategorySelect
                        params={params}
                        categories={facets.categories}
                    />
                    <CatalogColorSwatches
                        params={params}
                        colors={facets.colors}
                    />
                    <CatalogPriceFilter params={params} />
                </div>
                <CatalogFilterSheet params={params} facets={facets} />
                <div className="ml-auto">
                    <CatalogSortSelect params={params} />
                </div>
            </div>
            <CatalogActivePills
                params={params}
                categories={facets.categories}
            />
        </div>
    );
}
