import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lên Kèo Thôi API",
  description: "Backend API cho nền tảng đặt sân cầu lông Lên Kèo Thôi",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
