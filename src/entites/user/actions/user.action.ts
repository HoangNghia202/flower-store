"use server";

import { signIn } from "@/auth";
import bcrypt from "bcrypt";

// Action xử lý Đăng Ký (Email/Password)
export async function signUpAction(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (!email || !password) {
        return { error: "Vui lòng điền đầy đủ email và mật khẩu." };
    }

    try {
        // 1. Hash mật khẩu bằng bcryptjs trước khi lưu vào DB
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. LƯU VÀO DATABASE CỦA BẠN TẠI ĐÂY
        // Ví dụ với Prisma:
        // await prisma.user.create({ data: { email, name, password: hashedPassword } })
        console.log("Đã đăng ký User thành công vào DB:", {
            email,
            name,
            hashedPassword,
        });

        // 3. Tự động đăng nhập user sau khi đăng ký thành công (Tùy chọn)
        await signIn("credentials", {
            email,
            password,
            redirectTo: "/dashboard",
        });

        return { success: true };
    } catch (error: any) {
        if (error.type === "CredentialsSignin") {
            return { error: "Đăng nhập tự động thất bại." };
        }
        return { error: "Có lỗi xảy ra trong quá trình đăng ký." };
    }
}

// Action xử lý Đăng nhập bằng Google
export async function signInWithGoogle() {
    await signIn("google", { redirectTo: "/dashboard" });
}
