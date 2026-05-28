import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "matchmaker",
  description: "Personal matchmaking CRM",
};

export const viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 쿠키로 초기 테마를 SSR 단계에서 확정해 FOUC(잘못된 테마 깜빡임)를 없앤다.
  // 미들웨어가 매 요청 도는 앱이라 동적 렌더 비용은 무시 가능.
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  const isDark = theme === "dark";

  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${
        isDark ? " dark" : ""
      }`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
