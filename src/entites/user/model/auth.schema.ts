import { z } from "zod";

export const signupPasswordRequirements =
    "Use at least 8 characters, including an uppercase letter, a lowercase letter, a number, and a special character.";

const signupPasswordComplexityMessage =
    "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.";

const emailSchema = z
    .string()
    .trim()
    .min(1, { message: "Email is required." })
    .email({ message: "Please enter a valid email address." })
    .transform((value) => value.toLowerCase());

const loginPasswordSchema = z.string().min(1, {
    message: "Password is required.",
});

const signupPasswordSchema = z
    .string()
    .min(8, {
        message: "Password must be at least 8 characters long.",
    })
    .refine(
        (value) => {
            return (
                /[a-z]/.test(value) &&
                /[A-Z]/.test(value) &&
                /\d/.test(value) &&
                /[^A-Za-z0-9]/.test(value)
            );
        },
        {
            message: signupPasswordComplexityMessage,
        },
    );

export const loginFormSchema = z.object({
    email: emailSchema,
    password: loginPasswordSchema,
});

export const signupFormSchema = z
    .object({
        email: emailSchema,
        password: signupPasswordSchema,
        "confirm-password": z.string().min(1, {
            message: "Please confirm your password.",
        }),
    })
    .refine((data) => data.password === data["confirm-password"], {
        path: ["confirm-password"],
        message: "Passwords do not match.",
    });

export type AuthFieldErrors = Partial<
    Record<"email" | "password" | "confirm-password", string[]>
>;

export function getAuthFieldErrors(error: z.ZodError): AuthFieldErrors {
    return error.flatten().fieldErrors as AuthFieldErrors;
}
