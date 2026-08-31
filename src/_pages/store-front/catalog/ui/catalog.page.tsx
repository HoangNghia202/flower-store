import { parseCatalogParams } from "@/src/entites/product/model";
import { getCatalogFacets, getProducts } from "@/src/entites/product/actions";
import { CatalogFilterWidget, CatalogProductsWidget } from "@/widgets/index";

export async function CatalogPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = parseCatalogParams(await searchParams);
    const [page, facets] = await Promise.all([
        getProducts(params),
        getCatalogFacets(),
    ]);

    return (
        <>
            <CatalogFilterWidget params={params} facets={facets} />
            <CatalogProductsWidget params={params} page={page} />
        </>
    );
}
