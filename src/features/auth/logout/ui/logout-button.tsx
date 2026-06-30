"use client";

import { Button } from "@/shared/ui";
import { LogOutIcon } from "lucide-react";
import { logoutAction } from "@/src/entites/user/actions";

type Props = React.ComponentProps<typeof Button>;

export function LogOutButton(props: Props) {
    const onSignOut = async () => {
        await logoutAction("/");
    };
    return (
        <Button {...props} onClick={onSignOut}>
            <LogOutIcon />
            Log out
        </Button>
    );
}
