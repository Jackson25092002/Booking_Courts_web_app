import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+84|0)\d{9}$/, "Số điện thoại không hợp lệ");

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(100, "Họ và tên không được vượt quá 100 ký tự"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email không hợp lệ")
    .max(255, "Email không được vượt quá 255 ký tự"),
  phone: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    phoneSchema.optional(),
  ),
  password: z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
    .max(72, "Mật khẩu không được vượt quá 72 ký tự"),
});

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email hoặc số điện thoại")
    .max(255, "Thông tin đăng nhập quá dài"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu").max(72),
});

const optionalProfileText = (maximum: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(100, "Họ và tên không được vượt quá 100 ký tự"),
  phone: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    phoneSchema.nullable(),
  ),
  avatarUrl: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.string().trim().url("Đường dẫn ảnh đại diện không hợp lệ").max(500).nullable(),
  ),
  gender: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.enum(["MALE", "FEMALE", "OTHER"]).nullable(),
  ),
  birthDate: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.string().date("Ngày sinh không hợp lệ").nullable(),
  ),
  playDistrict: optionalProfileText(100),
  skillLevel: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.enum(["A", "B", "C", "D"]).nullable(),
  ),
});
