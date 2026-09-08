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
                    {order.items.map((i) => (
                        <li
                            key={i.id}
                            className="flex justify-between py-2 text-gray-600"
                        >
                            <span>
                                {i.quantity}× {i.product.name}
                            </span>
                            <span>{vnd(i.price * i.quantity)}</span>
                        </li>
                    ))}
                    {order.customBouquets.map((c) => (
                        <li
                            key={c.id}
                            className="flex justify-between py-2 text-gray-600"
                        >
                            <span>
                                {c.quantity}× {c.name ?? "Custom bouquet"}
                            </span>
                            <span>{vnd(c.price * c.quantity)}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <dl className="mt-4 space-y-1 border-t pt-4 text-sm">
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
