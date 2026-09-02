"use client";

import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { CardMessageField } from "../card-message-field";

export function PhotoNoteStep() {
    const floristNote = useCustomBouquetStore((s) => s.floristNote);
    const setFloristNote = useCustomBouquetStore((s) => s.setFloristNote);

    return (
        <div className="space-y-6">
            <h2 className="font-playfair text-xl font-bold text-gray-900">
                Ghi chú cho florist
            </h2>
            <div>
                <label
                    htmlFor="florist-note"
                    className="block text-sm font-semibold text-gray-800"
                >
                    Bạn muốn giống ảnh ở điểm nào nhất?
                </label>
                <textarea
                    id="florist-note"
                    value={floristNote}
                    onChange={(e) => setFloristNote(e.target.value)}
                    rows={4}
                    placeholder="Ví dụ: giữ đúng tông màu và dáng bó dài; loại hoa có thể thay tương đương nếu hết; ưu tiên hồng và cẩm chướng..."
                    className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
                />
            </div>
            <CardMessageField />
        </div>
    );
}
