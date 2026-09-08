"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma/prisma-instance";

export interface OrderListItemVM {
    orderNumber: string;
    createdAt: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    totalAmount: number;
    itemCount: number;
}

export async function getMyOrdersAction(): Promise<OrderListItemVM[]> {
    const session = await auth();
    if (!session?.user?.id) return [];

    const rows = await prisma.order.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: { items: true, customBouquets: true },
    });

    return rows.map((o) => ({
        orderNumber: o.orderNumber,
        createdAt: o.createdAt.toISOString(),
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        totalAmount: o.totalAmount,
        itemCount:
            o.items.reduce((n, i) => n + i.quantity, 0) +
            o.customBouquets.reduce((n, c) => n + c.quantity, 0),
    }));
}
