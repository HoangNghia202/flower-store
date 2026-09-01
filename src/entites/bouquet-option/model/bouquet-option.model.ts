export interface BouquetOptionVM {
    id: string;
    name: string;
    color: string;
    price: number;
}

export function mapBouquetOption(row: {
    id: string;
    name: string;
    color: string;
    price: number;
}): BouquetOptionVM {
    return {
        id: row.id,
        name: row.name,
        color: row.color,
        price: row.price,
    };
}
