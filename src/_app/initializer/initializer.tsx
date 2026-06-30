"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/_app/store/useUserStore";
import { getMeAction } from "@/src/entites/user/actions";
import { GlobalLoading } from "@/shared/components/global-loading/global-loading";

export function Initializer({ children }: { children: React.ReactNode }) {
    const { user, setUser } = useUserStore();
    const [loading, setLoading] = useState(!user);

    useEffect(() => {
        getMeAction()
            .then((data) => {
                if (data) {
                    setUser(data);
                }
                setLoading(false);
            })
            .catch((error) => {
                console.error("Failed to load user data:", error);
                setLoading(false);
            });
    }, [setUser]);

    return loading ? <GlobalLoading /> : children;
}
