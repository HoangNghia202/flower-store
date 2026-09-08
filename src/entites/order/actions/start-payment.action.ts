"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma/prisma-instance";
import { parseOrderNumber } from "@/src/entites/order/model";
import { createPaymentLink } from "@/src/shared/lib/payos/create-payment-link";

const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export async function startPaymentAction(
    orderNumber: string,
): Promise<{ ok: true; redirect: string } | { ok: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Please sign in." };

    const seq = parseOrderNumber(orderNumber);
    if (seq == null) return { ok: false, error: "Order not found." };

    const order = await prisma.order.findUnique({ where: { orderSeq: seq } });
    if (!order || order.userId !== session.user.id) {
        return { ok: false, error: "Order not found." };
    }
    if (order.paymentMethod !== "PAYOS" || order.paymentStatus !== "UNPAID") {
        return { ok: false, error: "This order can't be paid online." };
    }

    try {
        const link = await createPaymentLink({
            orderCode: order.orderSeq,
            amount: Math.round(order.totalAmount),
            description: order.orderNumber,
            returnUrl: `${APP_URL}/checkout/return`,
            cancelUrl: `${APP_URL}/orders/${order.orderNumber}?payment=cancelled`,
        });
        await prisma.order.update({
            where: { id: order.id },
            data: { paymentSessionId: link.paymentLinkId },
        });
        return { ok: true, redirect: link.checkoutUrl };
    } catch (e) {
        console.error("startPaymentAction failed:", e);
        return {
            ok: false,
            error: "Couldn't start payment. Please try again.",
        };
    }
}
