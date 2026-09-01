"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { BUILDER_STEPS } from "@/shared/lib/constants/custom-bouquet.const";

export function BuilderStepper({ current }: { current: number }) {
    return (
        <ol className="mb-8 flex items-center gap-2">
            {BUILDER_STEPS.map((label, i) => {
                const stepNo = i + 1;
                const done = stepNo < current;
                const active = stepNo === current;
                return (
                    <li key={label} className="flex flex-1 items-center gap-2">
                        <div
                            aria-current={active ? "step" : undefined}
                            className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                                done && "bg-pink-500 text-white",
                                active &&
                                    "bg-pink-500 text-white ring-4 ring-pink-100",
                                !done &&
                                    !active &&
                                    "bg-gray-100 text-gray-400",
                            )}
                        >
                            {done ? <Check size={16} /> : stepNo}
                        </div>
                        <span
                            className={cn(
                                "hidden text-sm font-medium sm:inline",
                                active ? "text-gray-900" : "text-gray-400",
                            )}
                        >
                            {label}
                        </span>
                        {stepNo < BUILDER_STEPS.length && (
                            <div className="relative mx-1 h-0.5 flex-1 bg-gray-100">
                                <div
                                    className="absolute inset-y-0 left-0 bg-pink-500 transition-[width] duration-500"
                                    style={{
                                        width: done ? "100%" : "0%",
                                    }}
                                />
                            </div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
