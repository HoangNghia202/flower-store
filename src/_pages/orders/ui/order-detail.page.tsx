import { notFound } from "next/navigation";
import { getOrderByNumberAction } from "@/src/entites/order/actions/get-order-by-number.action";
import { StartPaymentButton } from "@/src/features/checkout";
import { ClearCartOnMount } from "./clear-cart-on-mount";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export async function OrderDetailPage({
    orderNumber,
    placed,
    paymentFlag,
}: {
    orderNumber: string;
    placed: boolean;
    paymentFlag?: string;
}) {
    const order = await getOrderByNumberAction(orderNumber);
    if (!order) notFound();

    const subtotal = order.totalAmount + order.discountAmount;

    return (
        <div className="py-8">
            {placed && <ClearCartOnMount />}
            {placed && (
                <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                    Order placed. We&apos;ll confirm it shortly.
                </p>
            )}
            {(paymentFlag === "pending" ||
                paymentFlag === "failed" ||
                paymentFlag === "cancelled") && (
                <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                    Payment isn&apos;t complete yet. You can pay now below.
                </p>
            )}

            <h1 className="mt-4 font-playfair text-2xl font-bold text-gray-900">
                {order.orderNumber}
            </h1>
            <p className="text-sm text-gray-500">
                {order.status} · {order.paymentMethod} · {order.paymentStatus}
            </p>

            {order.paymentMethod === "PAYOS" &&
                order.paymentStatus === "UNPAID" && (
                    <div className="mt-4">
                        <StartPaymentButton orderNumber={order.orderNumber} />
                    </div>
                )}

            <section className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                    <h2 className="font-semibold text-gray-800">Recipient</h2>
                    {order.isAnonymous && (
                        <p className="text-sm text-gray-500">
                            (sent anonymously)
                        </p>
                    )}
                    <p className="text-sm text-gray-600">
                        {order.recipientName}
                    </p>
                    <p className="text-sm text-gray-600">
                        {order.recipientPhone}
                    </p>
                    <p className="text-sm text-gray-600">
                        {order.recipientAddress}
                    </p>
                </div>
                <div>
                    <h2 className="font-semibold text-gray-800">Delivery</h2>
                    <p className="text-sm text-gray-600">
                        {new Date(order.deliveryDate).toLocaleDateString(
                            "vi-VN",
                        )}{" "}
                        · {order.deliverySlot}
                    </p>
                    {order.cardMessage && (
                        <p className="mt-2 text-sm text-gray-600">
                            Card: &ldquo;{order.cardMessage}&rdquo;
                        </p>
                    )}
                </div>
            </section>

            <section className="mt-6">
                <h2 className="font-semibold text-gray-800">Items</h2>
                <ul className="mt-2 divide-y text-sm">
                    {order.items.map((i) => {
                        const img = i.product.images?.[0];
                        const addons = Array.isArray(i.addons) ? i.addons : [];
                        return (
                            <li
                                key={i.id}
                                className="flex gap-3 py-2 text-gray-600"
                            >
                                {img && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={img}
                                        alt=""
                                        className="h-14 w-14 shrink-0 rounded object-cover"
                                    />
                                )}
                                <div className="flex flex-1 justify-between gap-2">
                                    <div>
                                        <span>
                                            {i.quantity}× {i.product.name}
                                        </span>
                                        {addons.length > 0 && (
                                            <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
                                                {addons.map((a, idx) => {
                                                    const ad = a as {
                                                        name?: string;
                                                        quantity?: number;
                                                        price?: number;
                                                    };
                                                    return (
                                                        <li key={idx}>
                                                            + {ad.name} (
                                                            {ad.quantity}×{" "}
                                                            {vnd(ad.price ?? 0)}
                                                            )
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                    <span className="shrink-0">
                                        {vnd(i.price * i.quantity)}
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                    {order.customBouquets.map((c) => {
                        const meta = (c.meta ?? {}) as Record<string, unknown>;
                        const metaLines: string[] = [];
                        for (const [k, label] of [
                            ["occasion", "Dịp"],
                            ["tierLabel", "Ngân sách"],
                            ["style", "Kiểu"],
                            ["arrangementNote", "Sắp xếp"],
                            ["floristNote", "Ghi chú"],
                            ["wrapPaper", "Giấy gói"],
                            ["ribbon", "Ruy băng"],
                        ] as const) {
                            const v = meta[k];
                            if (typeof v === "string" && v)
                                metaLines.push(`${label}: ${v}`);
                        }
                        const colors = meta["colors"];
                        if (Array.isArray(colors) && colors.length)
                            metaLines.push(`Màu: ${colors.join(", ")}`);
                        const flowers = meta["flowers"];
                        if (Array.isArray(flowers)) {
                            const names = flowers
                                .map((f) => (f as { name?: string }).name)
                                .filter(Boolean)
                                .join(" · ");
                            if (names) metaLines.push(names);
                        }
                        return (
                            <li
                                key={c.id}
                                className="flex gap-3 py-2 text-gray-600"
                            >
                                {c.imageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={c.imageUrl}
                                        alt=""
                                        className="h-14 w-14 shrink-0 rounded object-cover"
                                    />
                                )}
                                <div className="flex flex-1 justify-between gap-2">
                                    <div>
                                        <span>
                                            {c.quantity}×{" "}
                                            {c.name ?? "Custom bouquet"}
                                        </span>
                                        {metaLines.length > 0 && (
                                            <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
                                                {metaLines.map((line, idx) => (
                                                    <li key={idx}>{line}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <span className="shrink-0">
                                        {vnd(c.price * c.quantity)}
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <dl className="mt-4 space-y-1 border-t pt-4 text-sm">
                <div className="flex justify-between text-gray-600">
                    <dt>Subtotal</dt>
                    <dd>{vnd(subtotal)}</dd>
                </div>
                {order.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                        <dt>
                            Discount
                            {order.couponCode ? ` (${order.couponCode})` : ""}
                        </dt>
                        <dd>-{vnd(order.discountAmount)}</dd>
                    </div>
                )}
                <div className="flex justify-between text-base font-semibold text-gray-900">
                    <dt>Total</dt>
                    <dd>{vnd(order.totalAmount)}</dd>
                </div>
            </dl>
        </div>
    );
}
