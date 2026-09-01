export interface StemVM {
    id: string;
    name: string;
    color: string;
    pricePerStem: number;
    stock: number;
}

export function mapStem(row: {
    id: string;
    name: string;
    color: string;
    pricePerStem: number;
    stock: number;
}): StemVM {
    return {
        id: row.id,
        name: row.name,
        color: row.color,
        pricePerStem: row.pricePerStem,
        stock: row.stock,
    };
}
