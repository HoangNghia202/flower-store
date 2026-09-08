import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/prisma/prisma-instance";
import { getPaymentStatus } from "@/src/shared/lib/payos/verify-payment";

export const dynamic = "force-dynamic";

export default async function CheckoutReturnPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = await searchParams;
    const session = await auth();
    if (!session?.user?.id) redirect("/login?redirectTo=/orders");

    const raw = Array.isArray(sp["orderCode"])
        ? sp["orderCode"][0]
        : sp["orderCode"];
    const orderSeq = Number(raw);
    if (!Number.isInteger(orderSeq) || orderSeq <= 0) notFound();

    const order = await prisma.order.findUnique({ where: { orderSeq } });
    if (!order || order.userId !== session.user.id) notFound();

    const status = await getPaymentStatus(orderSeq);
    if (status === "PAID" && order.paymentStatus !== "PAID") {
        await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: "PAID", status: "CONFIRMED" },
        });
    }

    // A cancelled return must never clear the cart: skip `placed=1` (which drives
    // <ClearCartOnMount>). PAID always wins even if `cancel=true` is present.
    const cancel = Array.isArray(sp["cancel"]) ? sp["cancel"][0] : sp["cancel"];
    if (status !== "PAID" && cancel === "true") {
        redirect(`/orders/${order.orderNumber}?payment=cancelled`);
    }

    const suffix =
        status === "PAID" ? "?placed=1" : "?placed=1&payment=pending";
    redirect(`/orders/${order.orderNumber}${suffix}`);
}
