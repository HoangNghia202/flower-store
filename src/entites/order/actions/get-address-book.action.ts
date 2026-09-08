"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma/prisma-instance";

export interface AddressBookOption {
    id: string;
    label: string;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
}

export async function getAddressBookAction(): Promise<AddressBookOption[]> {
    const session = await auth();
    if (!session?.user?.id) return [];

    const rows = await prisma.addressBookEntry.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => ({
        id: r.id,
        label: r.label,
        recipientName: r.recipientName,
        recipientPhone: r.recipientPhone,
        recipientAddress: r.recipientAddress,
    }));
}
