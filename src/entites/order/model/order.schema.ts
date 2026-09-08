import { z } from "zod";
import { DELIVERY_SLOTS } from "./delivery.const";

export const checkoutFormSchema = z.object({
    recipientName: z.string().trim().min(1, "Recipient name is required."),
    recipientPhone: z
        .string()
        .trim()
        .regex(
            /^(0\d{9}|\+84\d{9})$/,
            "Enter a valid Vietnamese phone number.",
        ),
    recipientAddress: z.string().trim().min(1, "Delivery address is required."),
    isAnonymous: z.boolean(),
    deliveryDate: z.string().min(1, "Choose a delivery date."),
    deliverySlot: z.enum(DELIVERY_SLOTS),
    cardMessage: z.string().trim().max(500, "Card message is too long."),
    paymentMethod: z.enum(["COD", "PAYOS"]),
    saveRecipient: z.boolean(),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export function getOrderFieldErrors(
    error: z.ZodError,
): Record<string, string[]> {
    return error.flatten().fieldErrors as Record<string, string[]>;
}
