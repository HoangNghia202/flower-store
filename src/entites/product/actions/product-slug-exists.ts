import { prisma } from "@/prisma/prisma-instance";

/**
 * Lightweight existence check for a product slug.
 *
 * Intentionally NOT marked `server-only`: it is called from `proxy.ts` (which
 * runs before the response body streams) so that an unknown `/catalog/[slug]`
 * can be answered with a real 404 status instead of a streamed soft-404. It
 * only selects the indexed `slug` column — no relations, no full row.
 */
export async function productSlugExists(slug: string): Promise<boolean> {
    const row = await prisma.product.findUnique({
        where: { slug },
        select: { slug: true },
    });
    return row !== null;
}
