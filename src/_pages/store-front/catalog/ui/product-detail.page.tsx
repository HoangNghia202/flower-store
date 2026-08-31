import { notFound } from "next/navigation";
import { getProductBySlug } from "@/src/entites/product/actions";
import { CatalogProductDetailWidget } from "@/widgets/index";

export async function ProductDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) notFound();
    return <CatalogProductDetailWidget product={product} />;
}
