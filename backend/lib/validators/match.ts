import { z } from "zod";

export const createMatchSchema = z.object({
  courtId: z.string().uuid("Vui lòng chọn sân hợp lệ"),
  title: z.string().trim().min(5, "Tên kèo cần ít nhất 5 ký tự").max(150),
  description: z.string().trim().max(1000).optional(),
  level: z.string().trim().min(2, "Vui lòng chọn trình độ").max(50),
  startsAt: z.iso.datetime({ offset: true }),
  maxPlayers: z.number().int().min(2).max(20),
  currentPlayers: z.number().int().min(1).max(19),
}).refine((value) => value.currentPlayers < value.maxPlayers, {
  path: ["currentPlayers"],
  message: "Số người đã có phải ít hơn tổng số người",
});
