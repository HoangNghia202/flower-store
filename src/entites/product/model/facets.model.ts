export interface CategoryOption {
    name: string;
    slug: string;
}

export interface CatalogFacets {
    categories: CategoryOption[];
    colors: string[];
}
