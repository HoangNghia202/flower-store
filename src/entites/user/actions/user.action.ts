"use server";

import { signIn, signOut } from "@/auth";
import bcrypt from "bcrypt";
import { AuthError } from "next-auth";
import { Prisma, UserRole } from "@/prisma/generated/client";
import { prisma } from "@/prisma/prisma-instance";
import {
    getAuthFieldErrors,
    loginFormSchema,
    signupFormSchema,
    type AuthFieldErrors,
} from "@/src/entites/user/model";

export type AuthActionState = {
    error?: string;
    fieldErrors?: AuthFieldErrors;
    success?: boolean;
};

// Action xử lý Đăng Ký (Email/Password)
export async function signUpAction(
    _prevState: AuthActionState | null,
    formData: FormData,
): Promise<AuthActionState> {
    const validationResult = signupFormSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
        "confirm-password": formData.get("confirm-password"),
    });
    const redirectTo = String(formData.get("redirectTo") ?? "/");

    if (!validationResult.success) {
        return {
            error: "Please correct the highlighted fields.",
            fieldErrors: getAuthFieldErrors(validationResult.error),
        };
    }

    const { email, password } = validationResult.data;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                email,
                name: "",
                password: hashedPassword,
                role: UserRole.ADMIN,
            },
        });

        console.log("Đã đăng ký User thành công vào DB:", {
            email,
            hashedPassword,
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return {
                error: "This email is already registered.",
                fieldErrors: {
                    email: ["This email is already registered."],
                },
            };
        }

        console.error("Không thể tạo tài khoản:", error);
        return { error: "Unable to create your account right now." };
    }

    try {
        await signIn("credentials", {
            email,
            password,
            redirectTo,
        });

        return { success: true };
    } catch (error) {
        if (error instanceof AuthError) {
            if (error.type === "CredentialsSignin") {
                return {
                    error: "Automatic sign-in failed after registration.",
                };
            }
        }

        throw error;
    }
}

export async function loginAction(
    _prevState: AuthActionState | null,
    formData: FormData,
): Promise<AuthActionState> {
    debugger;
    const validationResult = loginFormSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
    });
    const redirectTo = String(formData.get("redirectTo") ?? "/");

    if (!validationResult.success) {
        return {
            error: "Please correct the highlighted fields.",
            fieldErrors: getAuthFieldErrors(validationResult.error),
        };
    }

    const { email, password } = validationResult.data;

    try {
        await signIn("credentials", {
            email,
            password,
            redirectTo,
        });

        return { success: true };
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Invalid email or password." };
                default:
                    return { error: "Unable to sign in right now." };
            }
        }

        throw error;
    }
}

// Action xử lý Đăng nhập bằng Google
export async function signInWithGoogle(redirectUrl?: string) {
    await signIn("google", { redirectTo: redirectUrl });
}

export async function logoutAction(redirectTo?: string) {
    await signOut({
        redirectTo,
    });
}
