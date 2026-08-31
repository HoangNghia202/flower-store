import "server-only";
import { prisma } from "@/prisma/prisma-instance";
import type { CatalogFacets } from "@/src/entites/product/model";

export async function getCatalogFacets(): Promise<CatalogFacets> {
    const [categories, stemColors] = await Promise.all([
        prisma.category.findMany({
            select: { name: true, slug: true },
            orderBy: { name: "asc" },
        }),
        prisma.stem.findMany({
            select: { color: true },
            distinct: ["color"],
            orderBy: { color: "asc" },
        }),
    ]);

    return { categories, colors: stemColors.map((s) => s.color) };
}
