"use client";

import { useState } from "react";
import { Button } from "@/shared/ui";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from "@/shared/ui";
import { useCustomBouquetStore } from "@/_app/store/useCustomBouquetStore";

const FIELD_ID = "card-message";

export function CardMessageField() {
    const cardMessage = useCustomBouquetStore((s) => s.cardMessage);
    const setCardMessage = useCustomBouquetStore((s) => s.setCardMessage);

    return (
        <div>
            <label
                htmlFor={FIELD_ID}
                className="block text-sm font-semibold text-gray-800"
            >
                Lời nhắn trên thiệp
            </label>
            <textarea
                id={FIELD_ID}
                value={cardMessage}
                onChange={(e) => setCardMessage(e.target.value)}
                rows={3}
                placeholder="Ví dụ: Chúc mừng sinh nhật! Mong mọi điều tốt đẹp nhất đến với bạn."
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
        </div>
    );
}

export function useCardMessageGate(onProceed: () => void) {
    const [dialogOpen, setDialogOpen] = useState(false);

    function attemptAddToCart() {
        const msg = useCustomBouquetStore.getState().cardMessage.trim();
        if (msg.length > 0) {
            onProceed();
        } else {
            setDialogOpen(true);
        }
    }

    function onWriteMessage() {
        setDialogOpen(false);
        // let the dialog close before focusing
        setTimeout(() => document.getElementById(FIELD_ID)?.focus(), 0);
    }

    function onContinue() {
        setDialogOpen(false);
        onProceed();
    }

    return {
        attemptAddToCart,
        dialogOpen,
        setDialogOpen,
        onWriteMessage,
        onContinue,
    };
}

export function CardMessageDialog({
    open,
    onOpenChange,
    onWriteMessage,
    onContinue,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onWriteMessage: () => void;
    onContinue: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Bạn chưa nhập lời nhắn</DialogTitle>
                    <DialogDescription>
                        Bạn muốn thêm lời nhắn cho tấm thiệp không?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onContinue}>
                        Tiếp tục
                    </Button>
                    <Button
                        type="button"
                        onClick={onWriteMessage}
                        className="bg-pink-500 hover:bg-pink-600"
                    >
                        Nhập lời nhắn
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
