import type { Metadata } from "next";
import { getProductBySlug } from "@/src/entites/product/actions";

export { ProductDetailPage as default } from "@/_pages/store-front/catalog";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) return { title: "Product not found | Bloom" };
    return {
        title: `${product.name} | Bloom`,
        description: product.description.slice(0, 155),
    };
}
