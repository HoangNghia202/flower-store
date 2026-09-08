import type { Metadata } from "next";
import { OrderDetailPage } from "@/_pages/orders";

export const metadata: Metadata = {
    title: "Order | Bloom",
};

export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { slug } = await params;
    const sp = await searchParams;
    const placed = sp["placed"] === "1";
    const paymentFlag =
        typeof sp["payment"] === "string" ? sp["payment"] : undefined;
    return (
        <OrderDetailPage
            orderNumber={slug}
            placed={placed}
            paymentFlag={paymentFlag}
        />
    );
}
