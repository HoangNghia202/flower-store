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
                    Đặt bó hoa của riêng bạn
                </h1>
                <p className="mt-2 text-gray-500">
                    Tự thiết kế từng chi tiết, hoặc gửi ảnh mẫu để florist làm
                    theo.
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
