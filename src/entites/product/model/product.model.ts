export const PLACEHOLDER_IMAGE = "/placeholder-flower.svg";

interface CategoryRef {
    name: string;
    slug: string;
}

export interface ProductCardRow {
    id: string;
    name: string;
    slug: string;
    price: number;
    images: string[];
    stock: number;
    isFeatured: boolean;
    category: CategoryRef;
}

export interface ProductDetailRow extends ProductCardRow {
    description: string;
    stems: { quantity: number; stem: { name: string; color: string } }[];
}

export interface ProductCardVM {
    id: string;
    name: string;
    slug: string;
    price: number;
    image: string;
    hasImage: boolean;
    images: string[];
    inStock: boolean;
    isFeatured: boolean;
    categoryName: string;
}

export interface ProductDetailVM extends ProductCardVM {
    description: string;
    categorySlug: string;
    stock: number;
    stems: { name: string; color: string; quantity: number }[];
}

export function mapProductCard(row: ProductCardRow): ProductCardVM {
    const hasImage = row.images.length > 0;
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        price: row.price,
        image: hasImage ? row.images[0] : PLACEHOLDER_IMAGE,
        hasImage,
        images: row.images,
        inStock: row.stock > 0,
        isFeatured: row.isFeatured,
        categoryName: row.category.name,
    };
}

export function mapProductDetail(row: ProductDetailRow): ProductDetailVM {
    return {
        ...mapProductCard(row),
        description: row.description,
        categorySlug: row.category.slug,
        stock: row.stock,
        stems: row.stems.map((s) => ({
            name: s.stem.name,
            color: s.stem.color,
            quantity: s.quantity,
        })),
    };
}
