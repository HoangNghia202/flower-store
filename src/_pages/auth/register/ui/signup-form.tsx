"use client"; // 1. Support React Hooks client-side

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
} from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import Link from "next/link";
import Image from "next/image";
import { JSX, useActionState } from "react";
import { AuthActionState } from "@/src/entites/user/actions"; // 2. Import useActionState

type Props = React.ComponentProps<"div"> & {
    signUpAction: (
        state: AuthActionState | null,
        data: FormData,
    ) => Promise<AuthActionState>;
    onSignInWithGoogle: () => void;
    redirectTo?: string;
};

export function SignupForm({
    className,
    signUpAction,
    onSignInWithGoogle,
    redirectTo,
    ...divProps
}: Props): JSX.Element {
    const [state, formAction, isPending] = useActionState(signUpAction, {});

    return (
        <div className={cn("flex flex-col gap-6", className)} {...divProps}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    {/* 4. Use formAction instead of props.signUpAction */}
                    <form className="p-6 md:p-8" action={formAction}>
                        <FieldGroup>
                            <input
                                type="hidden"
                                name="redirectTo"
                                value={redirectTo ?? "/"}
                            />
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold">
                                    Create your account
                                </h1>
                                <p className="text-sm text-balance text-muted-foreground">
                                    Enter your email below to create your
                                    account
                                </p>
                            </div>

                            {/* Show error alerts return from Server Action */}
                            {state?.error && (
                                <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                                    {state.error}
                                </div>
                            )}

                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    name="email" // 5. Crucial: Added name attribute
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                />
                                <FieldDescription>
                                    We&apos;ll use this to contact you. We will
                                    not share your email with anyone else.
                                </FieldDescription>
                            </Field>
                            <Field>
                                <Field className="grid grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="password">
                                            Password
                                        </FieldLabel>
                                        <Input
                                            id="password"
                                            name="password" // 6. Crucial: Added name attribute
                                            type="password"
                                            required
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="confirm-password">
                                            Confirm Password
                                        </FieldLabel>
                                        <Input
                                            id="confirm-password"
                                            name="confirm-password" // 7. Crucial: Added name attribute
                                            type="password"
                                            required
                                        />
                                    </Field>
                                </Field>
                                <FieldDescription>
                                    Must be at least 8 characters long.
                                </FieldDescription>
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isPending}>
                                    {isPending
                                        ? "Creating Account..."
                                        : "Create Account"}
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
                                        Sign up with Google
                                    </span>
                                </Button>
                            </Field>
                            <FieldDescription className="text-center">
                                Already have an account?{" "}
                                <Link href={"/login"}>Login</Link>
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
