"use client";

import { ThemeProvider as AxisThemeProvider } from "@axis-ds/theme";

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: "light" | "dark" | "system";
}) {
  return (
    <AxisThemeProvider defaultTheme={defaultTheme} storageKey="foundry-x-theme">
      {children}
    </AxisThemeProvider>
  );
}
