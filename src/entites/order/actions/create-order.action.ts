"use server";

import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/prisma-instance";
import {
    checkoutFormSchema,
    computeDiscount,
    computeOrderTotals,
    computeSubtotal,
    formatOrderNumber,
    getOrderFieldErrors,
    isValidDeliveryDate,
    validateCoupon,
    type CartSnapshotItem,
    type CouponRow,
    type OrderActionState,
    type PricedLine,
} from "@/src/entites/order/model";
import { createPaymentLink } from "@/src/shared/lib/payos/create-payment-link";

const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
const MIN_PAYOS_AMOUNT = 1000;

export async function createOrderAction(
    _prevState: OrderActionState | null,
    formData: FormData,
): Promise<OrderActionState> {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Please sign in to place your order." };
    }
    const userId = session.user.id;

    // 1. Validate the form fields
    const parsed = checkoutFormSchema.safeParse({
        recipientName: formData.get("recipientName"),
        recipientPhone: formData.get("recipientPhone"),
        recipientAddress: formData.get("recipientAddress"),
        isAnonymous: formData.get("isAnonymous") === "on",
        deliveryDate: formData.get("deliveryDate"),
        deliverySlot: formData.get("deliverySlot"),
        cardMessage: formData.get("cardMessage") ?? "",
        paymentMethod: formData.get("paymentMethod"),
        saveRecipient: formData.get("saveRecipient") === "on",
    });
    if (!parsed.success) {
        return {
            error: "Please correct the highlighted fields.",
            fieldErrors: getOrderFieldErrors(parsed.error),
        };
    }
    const form = parsed.data;

    const deliveryDate = new Date(`${form.deliveryDate}T00:00:00`);
    if (!isValidDeliveryDate(deliveryDate, new Date())) {
        return {
            fieldErrors: {
                deliveryDate: ["Choose a date from tomorrow onward."],
            },
        };
    }

    // 2. Parse the cart snapshot
    let snapshot: CartSnapshotItem[];
    try {
        snapshot = JSON.parse(String(formData.get("cartSnapshot") ?? "[]"));
    } catch {
        snapshot = [];
    }
    if (!Array.isArray(snapshot) || snapshot.length === 0) {
        return { error: "Your cart is empty." };
    }

    // Input guard: every line quantity must be a positive integer.
    if (
        snapshot.some((i) => !Number.isInteger(i.quantity) || i.quantity <= 0)
    ) {
        return {
            error: "Some items in your cart have an invalid quantity. Please review your cart.",
        };
    }

    const standard = snapshot.filter((i) => !i.isCustomBouquet);
    const custom = snapshot.filter((i) => i.isCustomBouquet);

    // 3. Re-price standard items against the DB
    const productIds = standard.map((i) => i.id);
    const products = productIds.length
        ? await prisma.product.findMany({ where: { id: { in: productIds } } })
        : [];
    const priceById = new Map(products.map((p) => [p.id, p.price]));

    // Missing product OR a non-finite / negative DB price → treat as unavailable.
    if (
        standard.some((i) => {
            const price = priceById.get(i.id);
            return (
                typeof price !== "number" ||
                !Number.isFinite(price) ||
                price < 0
            );
        })
    ) {
        return {
            error: "Some items are no longer available. Please review your cart.",
        };
    }

    // Custom-bouquet snapshot price must be a positive finite number.
    if (
        custom.some(
            (i) =>
                typeof i.price !== "number" ||
                !Number.isFinite(i.price) ||
                i.price <= 0,
        )
    ) {
        return {
            error: "One of your custom bouquets is invalid. Please rebuild it.",
        };
    }

    const pricedLines: PricedLine[] = [
        ...standard.map((i) => ({
            unitPrice: priceById.get(i.id) as number,
            quantity: i.quantity,
        })),
        ...custom.map((i) => ({ unitPrice: i.price, quantity: i.quantity })),
    ];
    const addonsTotal = snapshot.reduce((sum, i) => {
        const perUnit = (i.addons ?? []).reduce((s, a) => {
            const price = Number(a.price);
            const quantity = Number(a.quantity);
            return (
                s +
                (Number.isFinite(price) ? price : 0) *
                    (Number.isFinite(quantity) ? quantity : 0)
            );
        }, 0);
        return sum + perUnit * i.quantity;
    }, 0);
    const subtotal = computeSubtotal(pricedLines, addonsTotal);

    // 4. Coupon
    const couponCode = String(formData.get("couponCode") ?? "")
        .trim()
        .toUpperCase();
    let discountArgs: {
        discountType: "PERCENTAGE" | "FIXED";
        value: number;
    } | null = null;
    if (couponCode) {
        const row = await prisma.coupon.findUnique({
            where: { code: couponCode },
        });
        const coupon: CouponRow | null = row
            ? {
                  code: row.code,
                  discountType: row.discountType as "PERCENTAGE" | "FIXED",
                  value: row.value,
                  maxUses: row.maxUses,
                  usedCount: row.usedCount,
                  active: row.active,
                  expiresAt: row.expiresAt,
              }
            : null;
        const check = validateCoupon(coupon, new Date());
        if (!check.ok) {
            return { fieldErrors: { couponCode: [check.reason] } };
        }
        discountArgs = {
            discountType: check.discountType,
            value: check.value,
        };
    }

    const discountAmount = discountArgs
        ? computeDiscount(discountArgs, subtotal)
        : 0;
    const totals = computeOrderTotals(subtotal, discountAmount);

    if (
        form.paymentMethod === "PAYOS" &&
        Math.round(totals.totalAmount) < MIN_PAYOS_AMOUNT
    ) {
        return {
            error: "This order total is too low for online payment. Please choose cash on delivery.",
        };
    }

    // 5. Persist
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) return { error: "Please sign in to place your order." };

    let orderNumber: string;
    let orderSeq: number;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    orderNumber: `TMP-${randomUUID()}`,
                    status: "PENDING",
                    paymentStatus: "UNPAID",
                    paymentMethod: form.paymentMethod,
                    totalAmount: Math.round(totals.totalAmount),
                    discountAmount: Math.round(totals.discountAmount),
                    couponCode: couponCode || null,
                    buyerName: user.name || form.recipientName,
                    buyerPhone: form.recipientPhone,
                    buyerEmail: user.email,
                    recipientName: form.recipientName,
                    recipientPhone: form.recipientPhone,
                    recipientAddress: form.recipientAddress,
                    isAnonymous: form.isAnonymous,
                    cardMessage: form.cardMessage || null,
                    deliveryDate,
                    deliverySlot: form.deliverySlot,
                    userId: user.id,
                    items: {
                        create: standard.map((i) => ({
                            productId: i.id,
                            quantity: i.quantity,
                            price: priceById.get(i.id) as number,
                            addons: i.addons?.length
                                ? (i.addons as Prisma.InputJsonValue)
                                : undefined,
                        })),
                    },
                    customBouquets: {
                        create: custom.map((i) => {
                            const cd = (i.customDetails ?? {}) as Record<
                                string,
                                unknown
                            >;
                            const rawStems = Array.isArray(cd["stems"])
                                ? (cd["stems"] as Array<{
                                      stemId?: unknown;
                                      quantity?: unknown;
                                  }>)
                                : [];
                            const stems = rawStems.filter(
                                (s) => typeof s.stemId === "string",
                            );
                            const refs = Array.isArray(cd["referenceImages"])
                                ? (cd["referenceImages"] as string[])
                                : [];
                            return {
                                price: i.price,
                                quantity: i.quantity,
                                wrapPaper:
                                    typeof cd["wrapPaper"] === "string"
                                        ? (cd["wrapPaper"] as string)
                                        : null,
                                ribbon:
                                    typeof cd["ribbon"] === "string"
                                        ? (cd["ribbon"] as string)
                                        : null,
                                name: i.name || null,
                                imageUrl: refs[0] || i.image || null,
                                meta: cd as Prisma.InputJsonValue,
                                stems: stems.length
                                    ? {
                                          create: stems.map((s) => ({
                                              stemId: s.stemId as string,
                                              quantity:
                                                  typeof s.quantity === "number"
                                                      ? s.quantity
                                                      : 1,
                                          })),
                                      }
                                    : undefined,
                            };
                        }),
                    },
                },
            });

            if (discountArgs) {
                const fresh = await tx.coupon.findUnique({
                    where: { code: couponCode },
                });
                if (
                    !fresh ||
                    (fresh.maxUses != null && fresh.usedCount >= fresh.maxUses)
                ) {
                    throw new Error("COUPON_EXHAUSTED");
                }
                await tx.coupon.update({
                    where: { code: couponCode },
                    data: { usedCount: { increment: 1 } },
                });
            }

            const finalNumber = formatOrderNumber(order.orderSeq);
            await tx.order.update({
                where: { id: order.id },
                data: { orderNumber: finalNumber },
            });

            if (form.saveRecipient) {
                await tx.addressBookEntry.create({
                    data: {
                        userId: user.id,
                        label: form.recipientName,
                        recipientName: form.recipientName,
                        recipientPhone: form.recipientPhone,
                        recipientAddress: form.recipientAddress,
                    },
                });
            }

            return { orderNumber: finalNumber, orderSeq: order.orderSeq };
        });
        orderNumber = result.orderNumber;
        orderSeq = result.orderSeq;
    } catch (e) {
        if (e instanceof Error && e.message === "COUPON_EXHAUSTED") {
            return {
                fieldErrors: {
                    couponCode: ["That coupon is no longer available."],
                },
            };
        }
        console.error("createOrderAction failed:", e);
        return { error: "We couldn't place your order. Please try again." };
    }

    // 6. Payment branch
    if (form.paymentMethod === "COD") {
        return { ok: true, redirect: `/orders/${orderNumber}?placed=1` };
    }

    try {
        const link = await createPaymentLink({
            orderCode: orderSeq,
            amount: Math.round(totals.totalAmount),
            description: orderNumber,
            returnUrl: `${APP_URL}/checkout/return`,
            cancelUrl: `${APP_URL}/checkout?payment=cancelled`,
        });
        await prisma.order.update({
            where: { orderSeq },
            data: { paymentSessionId: link.paymentLinkId },
        });
        return { ok: true, redirect: link.checkoutUrl, external: true };
    } catch (e) {
        console.error("PayOS link creation failed:", e);
        return {
            ok: true,
            redirect: `/orders/${orderNumber}?placed=1&payment=failed`,
        };
    }
}
