"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { MAX_REFERENCE_IMAGES } from "@/shared/lib/constants/custom-bouquet.const";

export function PhotoUploadStep() {
    const referenceFiles = useCustomBouquetStore((s) => s.referenceFiles);
    const addReferenceFile = useCustomBouquetStore((s) => s.addReferenceFile);
    const removeReferenceFile = useCustomBouquetStore(
        (s) => s.removeReferenceFile,
    );

    const inputRef = useRef<HTMLInputElement>(null);
    const [previews, setPreviews] = useState<string[]>([]);

    useEffect(() => {
        const urls = referenceFiles.map((f) => URL.createObjectURL(f));
        // eslint-disable-next-line react-hooks/set-state-in-effect -- object-URL lifecycle sync
        setPreviews(urls);
        return () => urls.forEach((u) => URL.revokeObjectURL(u));
    }, [referenceFiles]);

    const remaining = MAX_REFERENCE_IMAGES - referenceFiles.length;

    function handleFiles(files: FileList | null) {
        if (!files) return;
        const picked = Array.from(files).slice(0, remaining);
        for (const file of picked) {
            addReferenceFile(file);
        }
        if (inputRef.current) inputRef.current.value = "";
    }

    return (
        <div>
            <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-playfair text-xl font-bold text-gray-900">
                    Tải ảnh mẫu
                </h2>
                <span className="text-sm text-gray-400">
                    {referenceFiles.length} / {MAX_REFERENCE_IMAGES}
                </span>
            </div>

            <div
                className="grid grid-cols-3 gap-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    handleFiles(e.dataTransfer.files);
                }}
            >
                {referenceFiles.map((file, i) => (
                    <div
                        key={file.name + file.size + i}
                        className="relative aspect-square overflow-hidden rounded-xl border"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previews[i]}
                            alt="Ảnh mẫu"
                            className="h-full w-full object-cover"
                        />
                        <button
                            type="button"
                            aria-label="Xoá ảnh"
                            onClick={() => removeReferenceFile(file)}
                            className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}

                {remaining > 0 && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-pink-300"
                    >
                        + Thêm ảnh
                    </button>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => handleFiles(e.target.files)}
            />

            <p className="mt-2 text-xs text-gray-400">
                Tải lên 1–{MAX_REFERENCE_IMAGES} ảnh bó hoa bạn muốn florist
                phỏng theo.
            </p>
        </div>
    );
}
