import "server-only";
import PayOS from "@payos/node";

let client: PayOS | null = null;

function required(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required env var: ${name}`);
    return value;
}

export function getPayos(): PayOS {
    if (!client) {
        client = new PayOS(
            required("PAYOS_CLIENT_ID"),
            required("PAYOS_API_KEY"),
            required("PAYOS_CHECKSUM_KEY"),
        );
    }
    return client;
}
