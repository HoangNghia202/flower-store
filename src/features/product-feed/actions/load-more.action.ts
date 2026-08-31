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
    const result = catalogParamsSchema.safeParse(query);
    const parsed = result.success ? result.data : catalogParamsSchema.parse({});
    return getProducts({ ...parsed, cursor });
}
