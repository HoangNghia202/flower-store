"use client";

import { Sparkles, ImageIcon } from "lucide-react";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";

export function ModeSelectWidget() {
    const setMode = useCustomBouquetStore((s) => s.setMode);

    return (
        <div className="mx-auto max-w-3xl">
            <h2 className="text-center font-playfair text-2xl font-bold text-gray-900">
                Bạn muốn đặt hoa theo cách nào?
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => setMode("build")}
                    className="rounded-2xl border border-gray-200 p-6 text-left transition-all hover:border-pink-300 hover:shadow-md"
                >
                    <Sparkles className="text-pink-500" />
                    <h3 className="mt-3 font-semibold text-gray-900">
                        Tự thiết kế
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Chọn dịp, ngân sách, màu sắc, loại hoa — florist dựng bó
                        theo ý bạn.
                    </p>
                    <span className="mt-3 inline-block text-sm font-medium text-pink-600">
                        Bắt đầu →
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setMode("photo")}
                    className="rounded-2xl border border-gray-200 p-6 text-left transition-all hover:border-pink-300 hover:shadow-md"
                >
                    <ImageIcon className="text-pink-500" />
                    <h3 className="mt-3 font-semibold text-gray-900">
                        Đặt theo ảnh mẫu
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Có sẵn ảnh bó hoa bạn thích? Tải lên, florist làm phỏng
                        theo.
                    </p>
                    <span className="mt-3 inline-block text-sm font-medium text-pink-600">
                        Tải ảnh lên →
                    </span>
                </button>
            </div>
        </div>
    );
}
