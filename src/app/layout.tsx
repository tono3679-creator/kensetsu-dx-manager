import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_NAME } from "@/lib/constants";

import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: "中小建設会社・設備工事会社向けの業務DX管理システム。案件・日報・勤怠・原価・売上を一元管理します。",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} h-full`}>
      <body className="min-h-full">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="top-center" richColors closeButton theme="light" />
      </body>
    </html>
  );
}
