"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/shared/lib/utils";
import { PLACEHOLDER_IMAGE } from "@/src/entites/product/model";

export function ProductGallery({
    images,
    name,
}: {
    images: string[];
    name: string;
}) {
    const gallery = images.length > 0 ? images : [PLACEHOLDER_IMAGE];
    const [active, setActive] = useState(0);
    const hasReal = images.length > 0;

    return (
        <div className="space-y-3">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-pink-100 to-violet-100">
                {hasReal ? (
                    <Image
                        src={gallery[active]}
                        alt={name}
                        fill
                        sizes="(min-width:1024px) 40vw, 100vw"
                        className="object-cover"
                    />
                ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-8xl select-none">
                        💐
                    </span>
                )}
            </div>
            {hasReal && gallery.length > 1 && (
                <div className="flex gap-2">
                    {gallery.map((src, i) => (
                        <button
                            key={src}
                            type="button"
                            onClick={() => setActive(i)}
                            className={cn(
                                "relative h-16 w-16 overflow-hidden rounded-lg border",
                                i === active
                                    ? "border-pink-500"
                                    : "border-transparent",
                            )}
                        >
                            <Image
                                src={src}
                                alt=""
                                fill
                                sizes="64px"
                                className="object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
