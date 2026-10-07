import { z } from "zod";

// Supabase Auth hashes with bcrypt, which ignores everything after 72 bytes.
export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`);

const passwordsMatch = {
  check: (data: { password: string; confirmPassword: string }) =>
    data.password === data.confirmPassword,
  params: { message: "The passwords don't match.", path: ["confirmPassword"] },
};

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine(passwordsMatch.check, passwordsMatch.params);
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120, "Use at most 120 characters."),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch.check, passwordsMatch.params)
  .refine((data) => data.currentPassword !== data.password, {
    message: "Choose a password different from your current one.",
    path: ["password"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1),
    fullName: z
      .string()
      .trim()
      .min(1, "Enter your name.")
      .max(120, "Use at most 120 characters."),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch.check, passwordsMatch.params);
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
