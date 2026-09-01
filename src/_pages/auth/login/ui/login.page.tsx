import { loginAction, signInWithGoogle } from "@/src/entites/user/actions";
import { safeRedirectPath } from "@/src/entites/user/model";
import { LoginForm } from "./login-form";

export async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const redirectTo = safeRedirectPath((await searchParams).redirectUrl);

    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-4xl">
                <LoginForm
                    loginAction={loginAction}
                    onSignInWithGoogle={signInWithGoogle}
                    redirectTo={redirectTo}
                />
            </div>
        </div>
    );
}
