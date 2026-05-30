import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nimbus Notes",
  description: "AI-powered notes that keep your learning moving.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

