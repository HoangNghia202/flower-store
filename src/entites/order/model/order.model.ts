export type OrderActionState = {
    error?: string;
    fieldErrors?: Record<string, string[]>;
    ok?: boolean;
    redirect?: string;
    external?: boolean;
};

export interface CartSnapshotItem {
    id: string;
    quantity: number;
    isCustomBouquet: boolean;
    price: number;
    name: string;
    image?: string | null;
    customDetails?: Record<string, unknown> | null;
    addons?:
        | { id: string; name: string; price: number; quantity: number }[]
        | null;
}
