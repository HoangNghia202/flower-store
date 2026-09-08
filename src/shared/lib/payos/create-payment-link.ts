import "server-only";
import { getPayos } from "./payos-client";

export interface CreatePaymentLinkArgs {
    orderCode: number;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
}

export interface PaymentLink {
    checkoutUrl: string;
    paymentLinkId: string;
}

export async function createPaymentLink(
    args: CreatePaymentLinkArgs,
): Promise<PaymentLink> {
    const res = await getPayos().createPaymentLink({
        orderCode: args.orderCode,
        amount: args.amount,
        description: args.description.slice(0, 25),
        returnUrl: args.returnUrl,
        cancelUrl: args.cancelUrl,
    });
    return {
        checkoutUrl: res.checkoutUrl,
        paymentLinkId: res.paymentLinkId,
    };
}
