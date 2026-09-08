"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma/prisma-instance";
import { parseOrderNumber } from "@/src/entites/order/model";
import { createPaymentLink } from "@/src/shared/lib/payos/create-payment-link";
import { getPayos } from "@/src/shared/lib/payos/payos-client";

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

    // PayOS treats `orderCode` as unique per merchant — a second createPaymentLink
    // for the same code throws. Try to reuse / reconcile any existing link first.
    try {
        const info = await getPayos().getPaymentLinkInformation(order.orderSeq);
        const status = (info?.status ?? "").toUpperCase();
        if (status === "PENDING" && info.id) {
            return {
                ok: true,
                redirect: `https://pay.payos.vn/web/${info.id}`,
            };
        }
        if (status === "PAID") {
            await prisma.order.updateMany({
                where: { orderSeq: order.orderSeq, paymentStatus: "UNPAID" },
                data: { paymentStatus: "PAID", status: "CONFIRMED" },
            });
            return { ok: false, error: "This order is already paid." };
        }
        if (status === "CANCELLED" || status === "EXPIRED") {
            return {
                ok: false,
                error: "This payment link has expired. Please place a new order.",
            };
        }
        // status UNKNOWN / no link yet → fall through to create
    } catch {
        // no existing link (or API error) → fall through to create a fresh one
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
