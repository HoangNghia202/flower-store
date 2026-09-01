import "server-only";
import { cache } from "react";
import { prisma } from "@/prisma/prisma-instance";
import { mapStem, type StemVM } from "@/src/entites/stem/model";

export const getStems = cache(async (): Promise<StemVM[]> => {
    const rows = await prisma.stem.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            color: true,
            pricePerStem: true,
            stock: true,
        },
    });
    return rows.map(mapStem);
});
