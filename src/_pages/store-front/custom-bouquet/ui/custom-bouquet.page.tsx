import { getStems } from "@/src/entites/stem/actions";
import {
    getRibbons,
    getWrapPapers,
} from "@/src/entites/bouquet-option/actions";
import { BouquetBuilderWidget } from "@/widgets/index";

export async function CustomBouquetPage() {
    const [stems, wraps, ribbons] = await Promise.all([
        getStems(),
        getWrapPapers(),
        getRibbons(),
    ]);

    return (
        <div className="py-8">
            <header className="mb-8 text-center">
                <h1 className="font-playfair text-3xl font-bold text-gray-900">
                    Design Your Own Bouquet
                </h1>
                <p className="mt-2 text-gray-500">
                    Choose your stems, wrap, and ribbon — we&apos;ll show
                    you a preview.
                </p>
            </header>
            <BouquetBuilderWidget
                stems={stems}
                wraps={wraps}
                ribbons={ribbons}
            />
        </div>
    );
}
