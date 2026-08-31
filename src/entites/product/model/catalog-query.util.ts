import type { Prisma } from "@/prisma/generated/client";
import type { CatalogParams } from "./catalog-params.schema";

export function toPrismaWhere(p: CatalogParams): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (p.category) where.category = { slug: p.category };
    if (p.color) {
        where.stems = {
            some: { stem: { color: { equals: p.color, mode: "insensitive" } } },
        };
    }
    if (p.q) where.name = { contains: p.q, mode: "insensitive" };

    let { minPrice, maxPrice } = p;
    if (
        minPrice !== undefined &&
        maxPrice !== undefined &&
        minPrice > maxPrice
    ) {
        [minPrice, maxPrice] = [maxPrice, minPrice];
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
        };
    }
    return where;
}

export function toPrismaOrderBy(
    p: CatalogParams,
): Prisma.ProductOrderByWithRelationInput[] {
    switch (p.sort) {
        case "price-asc":
            return [{ price: "asc" }, { id: "asc" }];
        case "price-desc":
            return [{ price: "desc" }, { id: "desc" }];
        case "featured":
            return [{ isFeatured: "desc" }, { id: "desc" }];
        case "newest":
        default:
            return [{ createdAt: "desc" }, { id: "desc" }];
    }
}

function toBase64Url(b64: string): string {
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? 0 : 4 - (b64.length % 4);
    return b64 + "=".repeat(pad);
}

export function encodeCursor(id: string): string {
    return toBase64Url(btoa(id));
}

export function decodeCursor(s: string): string | null {
    try {
        const decoded = atob(fromBase64Url(s));
        return decoded.length > 0 && /^[\w-]+$/.test(decoded) ? decoded : null;
    } catch {
        return null;
    }
}
