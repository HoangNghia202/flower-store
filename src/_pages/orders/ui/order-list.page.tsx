import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyOrdersAction } from "@/src/entites/order/actions/get-my-orders.action";

function vnd(n: number): string {
    return n.toLocaleString("vi-VN") + "₫";
}

export async function OrderListPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login?redirectTo=/orders");

    const orders = await getMyOrdersAction();

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-24 text-center">
                <p className="text-lg font-medium text-gray-700">
                    No orders yet
                </p>
                <Link
                    href="/catalog"
                    className="mt-2 rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-600"
                >
                    Browse the catalog
                </Link>
            </div>
        );
    }

    return (
        <div className="py-8">
            <h1 className="font-playfair text-2xl font-bold text-gray-900">
                Your Orders
            </h1>
            <ul className="mt-6 space-y-3">
                {orders.map((o) => (
                    <li key={o.orderNumber}>
                        <Link
                            href={`/orders/${o.orderNumber}`}
                            className="flex items-center justify-between rounded-xl border border-pink-100 bg-white p-4 hover:border-pink-300"
                        >
                            <div>
                                <p className="font-semibold text-gray-900">
                                    {o.orderNumber}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {new Date(o.createdAt).toLocaleDateString(
                                        "vi-VN",
                                    )}{" "}
                                    · {o.itemCount} item(s)
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-gray-900">
                                    {vnd(o.totalAmount)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {o.status} · {o.paymentStatus}
                                </p>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
