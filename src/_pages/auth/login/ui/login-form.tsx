"use client";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
} from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { AuthActionState } from "@/src/entites/user/actions";
import {
    getAuthFieldErrors,
    loginFormSchema,
    type AuthFieldErrors,
} from "@/src/entites/user/model";
import Link from "next/link";
import Image from "next/image";
import { useActionState, useState } from "react";

type Props = React.ComponentProps<"div"> & {
    loginAction: (
        state: AuthActionState | null,
        data: FormData,
    ) => Promise<AuthActionState>;
    onSignInWithGoogle: () => void;
    redirectTo?: string;
};

export function LoginForm({
    className,
    loginAction,
    onSignInWithGoogle,
    redirectTo,
    ...props
}: Props) {
    const [state, formAction, isPending] = useActionState(loginAction, {});
    const [clientFieldErrors, setClientFieldErrors] =
        useState<AuthFieldErrors>({});
    const [clientFormError, setClientFormError] = useState<string>();

    const emailErrors = clientFieldErrors.email ?? state.fieldErrors?.email;
    const passwordErrors =
        clientFieldErrors.password ?? state.fieldErrors?.password;
    const formError = clientFormError ?? state.error;

    function clearFieldError(fieldName: keyof AuthFieldErrors) {
        setClientFieldErrors((currentErrors) => {
            if (!currentErrors[fieldName]) {
                return currentErrors;
            }

            const nextErrors = { ...currentErrors };
            delete nextErrors[fieldName];

            return nextErrors;
        });
        setClientFormError(undefined);
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        const formData = new FormData(event.currentTarget);
        const validationResult = loginFormSchema.safeParse({
            email: formData.get("email"),
            password: formData.get("password"),
        });

        if (!validationResult.success) {
            event.preventDefault();
            setClientFieldErrors(getAuthFieldErrors(validationResult.error));
            setClientFormError("Please correct the highlighted fields.");

            return;
        }

        setClientFieldErrors({});
        setClientFormError(undefined);
    }

    function toErrorItems(messages?: string[]) {
        return messages?.map((message) => ({ message }));
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form
                        className="p-6 md:p-8"
                        action={formAction}
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        <FieldGroup>
                            <input
                                type="hidden"
                                name="redirectTo"
                                value={redirectTo ?? "/"}
                            />
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold">
                                    Welcome back
                                </h1>
                                <p className="text-balance text-muted-foreground">
                                    Login to your Acme Inc account
                                </p>
                            </div>
                            {formError && (
                                <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                                    {formError}
                                </div>
                            )}
                            <Field
                                data-invalid={Boolean(emailErrors?.length) || undefined}
                            >
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    aria-invalid={Boolean(emailErrors?.length)}
                                    onChange={() => clearFieldError("email")}
                                    required
                                />
                                <FieldError errors={toErrorItems(emailErrors)} />
                            </Field>
                            <Field
                                data-invalid={Boolean(passwordErrors?.length) || undefined}
                            >
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">
                                        Password
                                    </FieldLabel>
                                    <a
                                        href="#"
                                        className="ml-auto text-sm underline-offset-2 hover:underline"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    aria-invalid={Boolean(passwordErrors?.length)}
                                    onChange={() => clearFieldError("password")}
                                    required
                                />
                                <FieldError
                                    errors={toErrorItems(passwordErrors)}
                                />
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? "Logging in..." : "Login"}
                                </Button>
                            </Field>
                            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                                Or continue with
                            </FieldSeparator>
                            <Field>
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={onSignInWithGoogle}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    <span className="sr-only">
                                        Login with Google
                                    </span>
                                </Button>
                            </Field>
                            <FieldDescription className="text-center">
                                Don&apos;t have an account?{" "}
                                <Link href={"/register"}>Register</Link>
                            </FieldDescription>
                        </FieldGroup>
                    </form>
                    <div className="relative hidden bg-muted md:block">
                        <Image
                            src="/globe.svg"
                            alt="Image"
                            fill
                            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
