"use client";

import { SignupForm } from "./signup-form";
import { signUpAction, signInWithGoogle } from "@/src/entites/user/actions";

export function SignupPage() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-4xl">
                <SignupForm
                    signUpAction={signUpAction}
                    onSignInWithGoogle={signInWithGoogle}
                />
            </div>
        </div>
    );
}
