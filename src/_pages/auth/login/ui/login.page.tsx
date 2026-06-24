"use client";

import { useSearchParams } from "next/navigation";
import { loginAction, signInWithGoogle } from "@/src/entites/user/actions";
import { LoginForm } from "./login-form";

export function LoginPage() {
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirectUrl") ?? "/catalog";

    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-4xl">
                <LoginForm
                    loginAction={loginAction}
                    onSignInWithGoogle={() => signInWithGoogle(redirectTo)}
                    redirectTo={redirectTo}
                />
            </div>
        </div>
    );
}
