"use server";

import { signIn } from "@/auth";
import bcrypt from "bcrypt";
import { AuthError } from "next-auth";
import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/prisma/prisma-instance";

export type AuthActionState = {
    error?: string;
    success?: boolean;
};

// Action xử lý Đăng Ký (Email/Password)
export async function signUpAction(
    _prevState: AuthActionState | null,
    formData: FormData,
): Promise<AuthActionState> {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm-password") ?? "");
    const redirectTo = String(formData.get("redirectTo") ?? "/");

    if (!email || !password) {
        return { error: "Vui lòng điền đầy đủ email và mật khẩu." };
    }

    if (password !== confirmPassword) {
        return { error: "Mật khẩu xác nhận không khớp." };
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                email,
                name: "",
                password: hashedPassword,
                role: "CUSTOMER",
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
            return { error: "Email này đã được đăng ký." };
        }

        console.error("Không thể tạo tài khoản:", error);
        return { error: "Có lỗi xảy ra trong quá trình đăng ký." };
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
                return { error: "Đăng nhập tự động thất bại." };
            }
        }

        throw error;
    }
}

export async function loginAction(
    prevState: AuthActionState | null,
    formData: FormData,
): Promise<AuthActionState> {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const redirectTo = String(formData.get("redirectTo") ?? "/");

    if (!email || !password) {
        return { error: "Please enter both email and password." };
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
