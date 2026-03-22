import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Syne, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { GoogleAuthProvider } from "@/components/google-auth-provider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Foundry-X — 사람과 AI가 함께 만드는 곳",
    template: "%s | Foundry-X",
  },
  description:
    "에이전트가 코드를 제안하고, 사람이 검증하고, Git이 기록하는 AI 협업 플랫폼.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={cn(jakarta.variable, syne.variable, jetbrains.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider defaultTheme="dark">
          <GoogleAuthProvider>
            {children}
          </GoogleAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
