"use client";

import { Button } from "@/shared/ui";
import { LogOutIcon } from "lucide-react";
import { logoutAction } from "@/src/entites/user/actions";

export function LogOutButton() {
    const onSignOut = async () => {
        await logoutAction("/");
    };
    return (
        <Button onClick={onSignOut}>
            <LogOutIcon />
            Log out
        </Button>
    );
}
