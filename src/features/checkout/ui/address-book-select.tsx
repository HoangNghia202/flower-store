"use client";

import { useEffect, useState } from "react";
import {
    getAddressBookAction,
    type AddressBookOption,
} from "@/src/entites/order/actions/get-address-book.action";

export function AddressBookSelect({
    onSelect,
}: {
    onSelect: (option: AddressBookOption) => void;
}) {
    const [options, setOptions] = useState<AddressBookOption[]>([]);

    useEffect(() => {
        getAddressBookAction()
            .then(setOptions)
            .catch(() => setOptions([]));
    }, []);

    if (options.length === 0) return null;

    return (
        <div className="space-y-1">
            <label className="text-sm text-gray-600">
                Use a saved recipient
            </label>
            <select
                defaultValue=""
                onChange={(e) => {
                    const option = options.find((o) => o.id === e.target.value);
                    if (option) onSelect(option);
                }}
                className="w-full rounded-md border px-3 py-2 text-sm"
            >
                <option value="">— New recipient —</option>
                {options.map((o) => (
                    <option key={o.id} value={o.id}>
                        {o.label} · {o.recipientName}
                    </option>
                ))}
            </select>
        </div>
    );
}
