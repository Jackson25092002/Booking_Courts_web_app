import "dotenv/config";
import prisma from "../lib/prisma";
import { sendMatchShortageReminders } from "../lib/match-reminders";

// Local demo only: run this alongside next dev. Hosting must use a scheduler.
let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try { console.log("Nhắc thiếu thành viên:", await sendMatchShortageReminders()); }
  catch { console.error("Không thể nhắc kèo. Kiểm tra database và migration."); }
  finally { busy = false; }
}
void tick();
const timer = setInterval(() => void tick(), 60000);
async function stop() { clearInterval(timer); await prisma.$disconnect(); process.exit(0); }
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
