import "server-only";
import { cache } from "react";
import { prisma } from "@/prisma/prisma-instance";
import {
    mapBouquetOption,
    type BouquetOptionVM,
} from "@/src/entites/bouquet-option/model";

const SELECT = {
    id: true,
    name: true,
    color: true,
    price: true,
} as const;

export const getWrapPapers = cache(async (): Promise<BouquetOptionVM[]> => {
    const rows = await prisma.wrapPaper.findMany({
        where: { active: true },
        orderBy: { price: "asc" },
        select: SELECT,
    });
    return rows.map(mapBouquetOption);
});

export const getRibbons = cache(async (): Promise<BouquetOptionVM[]> => {
    const rows = await prisma.ribbon.findMany({
        where: { active: true },
        orderBy: { price: "asc" },
        select: SELECT,
    });
    return rows.map(mapBouquetOption);
});
