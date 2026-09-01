"use client";

import { useEffect } from "react";
import { Button } from "@/shared/ui";
import type { StemVM } from "@/src/entites/stem/model";
import type { BouquetOptionVM } from "@/src/entites/bouquet-option/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { MIN_STEMS } from "@/shared/lib/constants/custom-bouquet.const";
import { BuilderStepper } from "./builder-stepper";
import { BouquetSummary } from "./bouquet-summary";
import { StemStep } from "./steps/stem-step";
import { WrapStep } from "./steps/wrap-step";
import { RibbonStep } from "./steps/ribbon-step";
import { ReviewStep } from "./steps/review-step";

interface Props {
    stems: StemVM[];
    wraps: BouquetOptionVM[];
    ribbons: BouquetOptionVM[];
}

export function BouquetBuilderWidget({ stems, wraps, ribbons }: Props) {
    const step = useCustomBouquetStore((s) => s.step);
    const nextStep = useCustomBouquetStore((s) => s.nextStep);
    const prevStep = useCustomBouquetStore((s) => s.prevStep);
    const resetBuilder = useCustomBouquetStore((s) => s.resetBuilder);
    const totalStems = useCustomBouquetStore((s) => s.getBuilderTotalStems());
    const wrap = useCustomBouquetStore((s) => s.selectedWrap);
    const ribbon = useCustomBouquetStore((s) => s.selectedRibbon);

    // Every visit starts a fresh bouquet.
    useEffect(() => {
        resetBuilder();
    }, [resetBuilder]);

    const canAdvance =
        (step === 1 && totalStems >= MIN_STEMS) ||
        (step === 2 && !!wrap) ||
        (step === 3 && !!ribbon);

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
                <BuilderStepper current={step} />

                <div key={step} className="animate-in fade-in duration-300">
                    {step === 1 && <StemStep stems={stems} />}
                    {step === 2 && <WrapStep wraps={wraps} />}
                    {step === 3 && <RibbonStep ribbons={ribbons} />}
                    {step === 4 && <ReviewStep />}
                </div>

                {step < 4 && (
                    <div className="mt-8 flex items-center justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={prevStep}
                            className={step === 1 ? "invisible" : ""}
                        >
                            Back
                        </Button>
                        <Button
                            type="button"
                            onClick={nextStep}
                            disabled={!canAdvance}
                            className="bg-pink-500 hover:bg-pink-600"
                        >
                            {step === 3 ? "Review" : "Next"}
                        </Button>
                    </div>
                )}
            </div>

            <BouquetSummary />
        </div>
    );
}
