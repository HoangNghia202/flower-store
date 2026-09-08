"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma/prisma-instance";
import { parseOrderNumber } from "@/src/entites/order/model";

export async function getOrderByNumberAction(orderNumber: string) {
    const session = await auth();
    if (!session?.user?.id) return null;

    const seq = parseOrderNumber(orderNumber);
    if (seq == null) return null;

    const order = await prisma.order.findUnique({
        where: { orderSeq: seq },
        include: {
            items: { include: { product: true } },
            customBouquets: {
                include: { stems: { include: { stem: true } } },
            },
        },
    });
    if (!order || order.userId !== session.user.id) return null;
    return order;
}

export type OrderWithRelations = NonNullable<
    Awaited<ReturnType<typeof getOrderByNumberAction>>
>;
