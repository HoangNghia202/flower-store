import "server-only";
import { prisma } from "@/prisma/prisma-instance";
import {
    mapProductDetail,
    type ProductDetailVM,
} from "@/src/entites/product/model";

export async function getProductBySlug(
    slug: string,
): Promise<ProductDetailVM | null> {
    const row = await prisma.product.findUnique({
        where: { slug },
        select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            price: true,
            images: true,
            stock: true,
            isFeatured: true,
            category: { select: { name: true, slug: true } },
            stems: {
                select: {
                    quantity: true,
                    stem: { select: { name: true, color: true } },
                },
                orderBy: { quantity: "desc" },
            },
        },
    });
    return row ? mapProductDetail(row) : null;
}
