import "server-only";
import { prisma } from "@/prisma/prisma-instance";
import {
    mapProductCard,
    toPrismaOrderBy,
    toPrismaWhere,
    decodeCursor,
    encodeCursor,
    type CatalogParams,
    type ProductCardVM,
} from "@/src/entites/product/model";

export const PRODUCTS_PAGE_SIZE = 24;

export type CatalogQuery = CatalogParams & { cursor?: string };

export interface ProductPage {
    items: ProductCardVM[];
    nextCursor: string | null;
    total: number;
}

const CARD_SELECT = {
    id: true,
    name: true,
    slug: true,
    price: true,
    images: true,
    stock: true,
    isFeatured: true,
    category: { select: { name: true, slug: true } },
} as const;

export async function getProducts(query: CatalogQuery): Promise<ProductPage> {
    const where = toPrismaWhere(query);
    const orderBy = toPrismaOrderBy(query);

    const cursorId = query.cursor ? decodeCursor(query.cursor) : null;

    const rows = await prisma.product.findMany({
        where,
        orderBy,
        select: CARD_SELECT,
        take: PRODUCTS_PAGE_SIZE + 1,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });

    const total = await prisma.product.count({ where });

    const hasMore = rows.length > PRODUCTS_PAGE_SIZE;
    const pageRows = hasMore ? rows.slice(0, PRODUCTS_PAGE_SIZE) : rows;
    const last = pageRows[pageRows.length - 1];

    return {
        items: pageRows.map(mapProductCard),
        nextCursor: hasMore && last ? encodeCursor(last.id) : null,
        total,
    };
}
