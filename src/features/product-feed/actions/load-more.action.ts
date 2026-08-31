"use server";

import {
    catalogParamsSchema,
    type CatalogParams,
} from "@/src/entites/product/model";
import { getProducts, type ProductPage } from "@/src/entites/product/actions";

export async function loadMoreProducts(
    query: CatalogParams,
    cursor: string,
): Promise<ProductPage> {
    const parsed = catalogParamsSchema.parse(query);
    return getProducts({ ...parsed, cursor });
}
