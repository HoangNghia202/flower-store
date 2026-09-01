import { ProductGrid, ProductCardSkeleton } from "@/src/entites/product";

export default function Loading() {
    return (
        <div className="py-6">
            <div className="mb-4 h-8 w-32 rounded bg-muted" />
            <ProductGrid>
                {Array.from({ length: 10 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </ProductGrid>
        </div>
    );
}
