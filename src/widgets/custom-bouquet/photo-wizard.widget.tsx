"use client";

import { Button } from "@/shared/ui";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { PHOTO_STEPS } from "@/shared/lib/constants/custom-bouquet.const";
import { BuilderStepper } from "./builder-stepper";
import { BouquetSummary } from "./bouquet-summary";
import { PhotoUploadStep } from "./steps/photo-upload-step";
import { OccasionStep } from "./steps/occasion-step";
import { BudgetStep } from "./steps/budget-step";
import { PhotoNoteStep } from "./steps/photo-note-step";
import { PhotoReviewStep } from "./steps/photo-review-step";

const REVIEW_STEP = 5;

export function PhotoWizardWidget() {
    // Whole-store subscribe: the Next button's disabled state depends on
    // referenceFiles / occasion / tier via `canProceed(step)`, so the
    // wizard must re-render on any of those. (Same pattern as BuildWizard.)
    const s = useCustomBouquetStore();
    const { step } = s;

    const onReview = step === REVIEW_STEP;

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

                <BuilderStepper steps={PHOTO_STEPS} current={step} />

                <div key={step} className="animate-in fade-in duration-300">
                    {step === 1 && <PhotoUploadStep />}
                    {step === 2 && <OccasionStep />}
                    {step === 3 && <BudgetStep />}
                    {step === 4 && <PhotoNoteStep />}
                    {step === REVIEW_STEP && <PhotoReviewStep />}
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
                            {step === 4 ? "Xem lại" : "Tiếp theo"}
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
