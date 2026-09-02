"use client";

import { Button } from "@/shared/ui";
import type { StemVM } from "@/src/entites/stem/model";
import type { BouquetOptionVM } from "@/src/entites/bouquet-option/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import {
    BUILD_STEPS,
    BUILD_STEPS_QUICK,
    BOUQUET_STYLES,
} from "@/shared/lib/constants/custom-bouquet.const";
import { BuilderStepper } from "./builder-stepper";
import { BouquetSummary } from "./bouquet-summary";
import { OccasionStep } from "./steps/occasion-step";
import { BudgetStep } from "./steps/budget-step";
import { ColorStep } from "./steps/color-step";
import { StyleStep } from "./steps/style-step";
import { FlowerStep } from "./steps/flower-step";
import { WrappingStep } from "./steps/wrapping-step";
import { ReviewStep } from "./steps/review-step";

const REVIEW_STEP = 7;

interface Props {
    stems: StemVM[];
    wraps: BouquetOptionVM[];
    ribbons: BouquetOptionVM[];
}

export function BuildWizardWidget({ stems, wraps, ribbons }: Props) {
    // Subscribe to the whole store: the Next button's disabled state depends
    // on many fields (occasion / tier / colors / style / flowers / wrap /
    // ribbon) via `canProceed(step)`, and the wizard must re-render whenever
    // any of them changes. A wizard re-rendering on every store change is
    // fine. (Same pattern as ReviewStep and BouquetSummary.)
    const s = useCustomBouquetStore();
    const { step, quick } = s;

    const steps = quick ? BUILD_STEPS_QUICK : BUILD_STEPS;
    // map internal step (always numbered against the full 7-step flow) to the
    // displayed stepper index
    const displayStep =
        quick && step === REVIEW_STEP ? BUILD_STEPS_QUICK.length : step;

    const onReview = step === REVIEW_STEP;

    const hidesWrapping = !!BOUQUET_STYLES.find(
        (st) => st.id === s.style && "hidesWrapping" in st,
    );
    // does pressing "next" from the current step land on the review step?
    const nextLandsOnReview =
        step === 6 || (step === 5 && hidesWrapping) || (quick && step === 3);

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
                <button
                    type="button"
                    onClick={s.resetMode}
                    className="mb-4 text-sm text-gray-500 hover:text-pink-600"
                >
                    ← Đổi cách đặt
                </button>

                <BuilderStepper steps={steps} current={displayStep} />

                <div key={step} className="animate-in fade-in duration-300">
                    {step === 1 && <OccasionStep />}
                    {step === 2 && <BudgetStep />}
                    {step === 3 && (
                        <>
                            <ColorStep />
                            <div className="mt-6 rounded-xl bg-pink-50/60 p-4">
                                <p className="text-sm text-gray-600">
                                    Không muốn chọn từng bước? Để florist tự
                                    quyết hoa và cách gói trong ngân sách của
                                    bạn.
                                </p>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2"
                                    disabled={!s.canProceed(3)}
                                    onClick={() => s.setQuick(true)}
                                >
                                    Đặt nhanh →
                                </Button>
                            </div>
                        </>
                    )}
                    {step === 4 && <StyleStep />}
                    {step === 5 && <FlowerStep stems={stems} />}
                    {step === 6 && (
                        <WrappingStep wraps={wraps} ribbons={ribbons} />
                    )}
                    {step === REVIEW_STEP && <ReviewStep />}
                </div>

                {!onReview && (
                    <div className="mt-8 flex items-center justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={s.prevStep}
                            className={step === 1 ? "invisible" : ""}
                        >
                            Quay lại
                        </Button>
                        <Button
                            type="button"
                            onClick={s.nextStep}
                            disabled={!s.canProceed(step)}
                            className="bg-pink-500 hover:bg-pink-600"
                        >
                            {nextLandsOnReview ? "Xem lại" : "Tiếp theo"}
                        </Button>
                    </div>
                )}
                {onReview && (
                    <div className="mt-8">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={s.prevStep}
                        >
                            Quay lại
                        </Button>
                    </div>
                )}
            </div>

            <BouquetSummary />
        </div>
    );
}
