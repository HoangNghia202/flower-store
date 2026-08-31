"use client";

import { SlidersHorizontal } from "lucide-react";
import {
    Button,
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/shared/ui";
import {
    type CatalogFacets,
    type CatalogParams,
} from "@/src/entites/product/model";
import { CatalogCategorySelect } from "./catalog-category-select";
import { CatalogColorSwatches } from "./catalog-color-swatches";
import { CatalogPriceFilter } from "./catalog-price-filter";

export function CatalogFilterSheet({
    params,
    facets,
}: {
    params: CatalogParams;
    facets: CatalogFacets;
}) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                    <SlidersHorizontal size={15} className="mr-1.5" />
                    Filters
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
                <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="space-y-5 px-4">
                    <div>
                        <p className="mb-2 text-sm font-medium">Occasion</p>
                        <CatalogCategorySelect
                            params={params}
                            categories={facets.categories}
                        />
                    </div>
                    <div>
                        <p className="mb-2 text-sm font-medium">Colour</p>
                        <CatalogColorSwatches
                            params={params}
                            colors={facets.colors}
                        />
                    </div>
                    <div>
                        <p className="mb-2 text-sm font-medium">Price</p>
                        <CatalogPriceFilter params={params} />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
