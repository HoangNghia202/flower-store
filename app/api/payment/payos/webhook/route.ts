import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma-instance";
import { getPayos } from "@/src/shared/lib/payos/payos-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
    let orderSeq: number | null = null;
    let amount = NaN;
    let paid = false;
    try {
        const body = await request.json();
        const data = getPayos().verifyPaymentWebhookData(body);
        orderSeq = Number(data.orderCode);
        amount = Number(data.amount);
        paid = data.code === "00";
    } catch {
        return NextResponse.json({ received: true });
    }

    if (
        paid &&
        orderSeq != null &&
        Number.isInteger(orderSeq) &&
        Number.isFinite(amount)
    ) {
        await prisma.order.updateMany({
            where: {
                orderSeq,
                paymentStatus: "UNPAID",
                paymentMethod: "PAYOS",
                totalAmount: amount,
            },
            data: { paymentStatus: "PAID", status: "CONFIRMED" },
        });
    }

    return NextResponse.json({ received: true });
}
