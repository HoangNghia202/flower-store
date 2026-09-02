"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { uploadImageToCloudinary } from "@/shared/lib/cloudinary";
import { MAX_REFERENCE_IMAGES } from "@/shared/lib/constants/custom-bouquet.const";

export function PhotoUploadStep() {
    const images = useCustomBouquetStore((s) => s.referenceImages);
    const addImage = useCustomBouquetStore((s) => s.addReferenceImage);
    const removeImage = useCustomBouquetStore((s) => s.removeReferenceImage);

    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const remaining = MAX_REFERENCE_IMAGES - images.length;

    async function handleFiles(files: FileList | null) {
        if (!files) return;
        setError(null);
        const picked = Array.from(files).slice(0, remaining);
        for (const file of picked) {
            setUploading((n) => n + 1);
            try {
                const url = await uploadImageToCloudinary(file);
                addImage(url);
            } catch (e) {
                setError(
                    e instanceof Error ? e.message : "Tải ảnh lên thất bại",
                );
            } finally {
                setUploading((n) => n - 1);
            }
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
                    {images.length} / {MAX_REFERENCE_IMAGES}
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
                {images.map((url) => (
                    <div
                        key={url}
                        className="relative aspect-square overflow-hidden rounded-xl border"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={url}
                            alt="Ảnh mẫu"
                            className="h-full w-full object-cover"
                        />
                        <button
                            type="button"
                            aria-label="Xoá ảnh"
                            onClick={() => removeImage(url)}
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
                        disabled={uploading > 0}
                        className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-pink-300 disabled:opacity-50"
                    >
                        {uploading > 0 ? "Đang tải…" : "+ Thêm ảnh"}
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

            {error && (
                <p role="alert" className="mt-2 text-sm text-red-500">
                    {error}
                </p>
            )}
            <p className="mt-2 text-xs text-gray-400">
                Tải lên 1–{MAX_REFERENCE_IMAGES} ảnh bó hoa bạn muốn florist
                phỏng theo.
            </p>
        </div>
    );
}
