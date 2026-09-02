"use client";

import { useEffect } from "react";
import type { StemVM } from "@/src/entites/stem/model";
import type { BouquetOptionVM } from "@/src/entites/bouquet-option/model";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";
import { ModeSelectWidget } from "./mode-select.widget";
import { BuildWizardWidget } from "./build-wizard.widget";
import { PhotoWizardWidget } from "./photo-wizard.widget";

interface Props {
    stems: StemVM[];
    wraps: BouquetOptionVM[];
    ribbons: BouquetOptionVM[];
}

export function BouquetBuilderWidget({ stems, wraps, ribbons }: Props) {
    const mode = useCustomBouquetStore((s) => s.mode);
    const resetBuilder = useCustomBouquetStore((s) => s.resetBuilder);

    // Fresh every visit.
    useEffect(() => {
        resetBuilder();
    }, [resetBuilder]);

    if (mode === "build") {
        return (
            <BuildWizardWidget stems={stems} wraps={wraps} ribbons={ribbons} />
        );
    }
    if (mode === "photo") {
        return <PhotoWizardWidget />;
    }
    return <ModeSelectWidget />;
}
