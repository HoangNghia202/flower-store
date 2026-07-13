"use client";

import { useLayoutEffect, useState } from "react";
import { useUserStore } from "@/_app/store/useUserStore";
import { getMeAction } from "@/src/entites/user/actions";
import { GlobalLoading } from "@/shared/components/global-loading/global-loading";

export function Initializer({ children }: { children: React.ReactNode }) {
    const { user, setUser } = useUserStore();
    const [loading, setLoading] = useState(!user);

    useLayoutEffect(() => {
        if (!user) {
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
        }
    }, []);

    return loading ? (
        <div className="w-full h-[100vh] flex items-center justify-center">
            <GlobalLoading />
        </div>
    ) : (
        children
    );
}
